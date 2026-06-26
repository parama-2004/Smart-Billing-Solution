using Billing.Api.Data;
using Billing.Api.Models;
using Billing.Api.Security;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.IO.Compression;
using System.Text;

namespace Billing.Api.Services;

public interface IMaintenanceService
{
    Task<bool> ValidateSuperAdminPasswordAsync(string password);
    Task<byte[]> BuildBackupFileAsync();
    Task AnnualResetAsync();
}

public class MaintenanceService : IMaintenanceService
{
    private readonly BillingDbContext _context;

    public MaintenanceService(BillingDbContext context)
    {
        _context = context;
    }

    public async Task<bool> ValidateSuperAdminPasswordAsync(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
            return false;

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Username == "superadmin" && u.IsActive);

        if (user == null)
            return false;

        return PasswordHasher.Verify(password, user.PasswordHash);
    }

    public async Task<byte[]> BuildBackupFileAsync()
    {
        var connection = _context.Database.GetDbConnection();
        var wasClosed = connection.State != System.Data.ConnectionState.Open;
        if (wasClosed)
            await connection.OpenAsync();

        try
        {
            var tableNames = new List<string>();

            using (var tableCommand = connection.CreateCommand())
            {
                tableCommand.CommandText = "SHOW TABLES";
                using var tableReader = await tableCommand.ExecuteReaderAsync();
                while (await tableReader.ReadAsync())
                {
                    tableNames.Add(tableReader.GetString(0));
                }
            }

            await using var memoryStream = new MemoryStream();
            using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, leaveOpen: true))
            {
                var readmeEntry = archive.CreateEntry("README.txt");
                await using (var readmeStream = readmeEntry.Open())
                await using (var readmeWriter = new StreamWriter(readmeStream, Encoding.UTF8, leaveOpen: false))
                {
                    await readmeWriter.WriteLineAsync($"Backup generated at UTC: {DateTime.UtcNow:O}");
                    await readmeWriter.WriteLineAsync("Format: one CSV file per table");
                }

                foreach (var tableName in tableNames)
                {
                    using var dataCommand = connection.CreateCommand();
                    dataCommand.CommandText = $"SELECT * FROM `{tableName}`";

                    using var dataReader = await dataCommand.ExecuteReaderAsync();
                    var entry = archive.CreateEntry($"{tableName}.csv");
                    await using var entryStream = entry.Open();
                    await using var writer = new StreamWriter(entryStream, Encoding.UTF8, leaveOpen: false);

                    var headers = Enumerable.Range(0, dataReader.FieldCount)
                        .Select(dataReader.GetName)
                        .ToArray();

                    await writer.WriteLineAsync(string.Join(",", headers.Select(EscapeCsv)));

                    while (await dataReader.ReadAsync())
                    {
                        var values = new string[dataReader.FieldCount];
                        for (var i = 0; i < dataReader.FieldCount; i++)
                            values[i] = EscapeCsv(ToCsvString(dataReader.IsDBNull(i) ? null : dataReader.GetValue(i)));

                        await writer.WriteLineAsync(string.Join(",", values));
                    }
                }
            }

            return memoryStream.ToArray();
        }
        finally
        {
            if (wasClosed)
                await connection.CloseAsync();
        }
    }

    private static string ToCsvString(object? value)
    {
        if (value == null)
            return string.Empty;

        if (value is byte[] bytes)
            return Convert.ToBase64String(bytes);

        if (value is DateTime dateTime)
            return dateTime.ToString("O", CultureInfo.InvariantCulture);

        if (value is DateTimeOffset dateTimeOffset)
            return dateTimeOffset.ToString("O", CultureInfo.InvariantCulture);

        return Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty;
    }

    private static string EscapeCsv(string input)
    {
        if (input.Contains('"'))
            input = input.Replace("\"", "\"\"");

        if (input.Contains(',') || input.Contains('\n') || input.Contains('\r') || input.Contains('"'))
            return $"\"{input}\"";

        return input;
    }

    public async Task AnnualResetAsync()
    {
        var tables = new[]
        {
            _context.Model.FindEntityType(typeof(DistributorOrderItem))?.GetTableName(),
            _context.Model.FindEntityType(typeof(DistributorOrder))?.GetTableName(),
            _context.Model.FindEntityType(typeof(InvoiceItem))?.GetTableName(),
            _context.Model.FindEntityType(typeof(Invoice))?.GetTableName(),
            _context.Model.FindEntityType(typeof(Payment))?.GetTableName(),
            _context.Model.FindEntityType(typeof(PurchaseEntry))?.GetTableName(),
            _context.Model.FindEntityType(typeof(PurchaseItem))?.GetTableName(),
            _context.Model.FindEntityType(typeof(PurchasePayment))?.GetTableName(),
            _context.Model.FindEntityType(typeof(PurchaseVat))?.GetTableName(),
            _context.Model.FindEntityType(typeof(Refund))?.GetTableName(),
            _context.Model.FindEntityType(typeof(SalesVat))?.GetTableName(),
            _context.Model.FindEntityType(typeof(LoyaltyRedemption))?.GetTableName(),
            _context.Model.FindEntityType(typeof(GiftProduct))?.GetTableName()
        }
        .Where(t => !string.IsNullOrWhiteSpace(t))
        .Distinct()
        .ToList();

        await using var tx = await _context.Database.BeginTransactionAsync();
        await _context.Database.ExecuteSqlRawAsync("SET FOREIGN_KEY_CHECKS = 0;");

        try
        {
            foreach (var table in tables)
            {
                await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE `" + table + "`;");
            }

            await _context.Database.ExecuteSqlRawAsync("SET FOREIGN_KEY_CHECKS = 1;");
            await tx.CommitAsync();
        }
        catch
        {
            await _context.Database.ExecuteSqlRawAsync("SET FOREIGN_KEY_CHECKS = 1;");
            await tx.RollbackAsync();
            throw;
        }
    }
}
