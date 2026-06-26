using System.Text.Json;
using Billing.Api.Data;
using Billing.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Billing.Api.Services;

public class DailyTallyService : IDailyTallyService
{
    private readonly BillingDbContext _db;
    private readonly ISalesmanCompensationService _salesmanCompensationService;
    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public DailyTallyService(
        BillingDbContext db,
        ISalesmanCompensationService salesmanCompensationService)
    {
        _db = db;
        _salesmanCompensationService = salesmanCompensationService;
    }

    public async Task<DailyTallyResponseDto> SaveAsync(SaveDailyTallyRequest request)
    {
        var date = request.TallyDate.Date;
        var now = DateTime.UtcNow;
        var normalizedPayload = NormalizePayload(request.Payload);
        var payloadJson = JsonSerializer.Serialize(normalizedPayload);

        var totalIncome = normalizedPayload.DailyTallyValues.Sum(x => x.Value);
        var totalExpenses = normalizedPayload.InternalExpenses.Sum(x => x.Value) + normalizedPayload.PaymentVendors.Sum(x => x.Amount);
        var net = totalIncome - totalExpenses;
        var totalCredits = normalizedPayload.ActualValues.Sum(x => x.Value);
        var difference = net - totalCredits;

        var existing = await _db.DailyTallyRecords
            .FirstOrDefaultAsync(x => x.TallyDate == date);

        if (existing is null)
        {
            existing = new DailyTallyRecord
            {
                TallyDate = date,
                PayloadJson = payloadJson,
                TotalIncome = totalIncome,
                TotalExpenses = totalExpenses,
                Net = net,
                StatusDifference = difference,
                CreatedAt = now,
                UpdatedAt = now
            };
            _db.DailyTallyRecords.Add(existing);
        }
        else
        {
            existing.PayloadJson = payloadJson;
            existing.TotalIncome = totalIncome;
            existing.TotalExpenses = totalExpenses;
            existing.Net = net;
            existing.StatusDifference = difference;
            existing.UpdatedAt = now;
        }

        await _db.SaveChangesAsync();

        await _salesmanCompensationService.SyncDailyTallyEntriesAsync(
            date,
            normalizedPayload.StaffSalaries,
            normalizedPayload.StaffAdvances
        );

        return new DailyTallyResponseDto(
            existing.Id,
            existing.TallyDate,
            normalizedPayload,
            existing.TotalIncome,
            existing.TotalExpenses,
            existing.Net,
            existing.StatusDifference,
            existing.UpdatedAt
        );
    }

    public async Task<DailyTallyResponseDto?> GetByDateAsync(DateTime date)
    {
        var normalizedDate = date.Date;

        var entity = await _db.DailyTallyRecords
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.TallyDate == normalizedDate);

        if (entity is null)
            return null;

        var payload = NormalizePayload(JsonSerializer.Deserialize<DailyTallyPayloadDto>(entity.PayloadJson, _jsonOptions));

        return new DailyTallyResponseDto(
            entity.Id,
            entity.TallyDate,
            payload,
            entity.TotalIncome,
            entity.TotalExpenses,
            entity.Net,
            entity.StatusDifference,
            entity.UpdatedAt
        );
    }

    public async Task<AnnualTallyReportResponse> GetAnnualReportAsync(int? year, DateTime? from, DateTime? to, string? expenseName)
    {
        DateTime start;
        DateTime endExclusive;

        if (from.HasValue && to.HasValue)
        {
            start = from.Value.Date;
            endExclusive = to.Value.Date.AddDays(1);
        }
        else
        {
            var reportYear = year ?? DateTime.Today.Year;
            start = new DateTime(reportYear, 1, 1);
            endExclusive = start.AddYears(1);
        }

        var records = await _db.DailyTallyRecords
            .AsNoTracking()
            .Where(x => x.TallyDate >= start && x.TallyDate < endExclusive)
            .ToListAsync();

        var rows = records
            .GroupBy(x => x.TallyDate.Month)
            .Select(g => new
            {
                Month = g.Key,
                EntryCount = g.Count(),
                TotalIncome = g.Sum(x => x.TotalIncome),
                TotalExpenses = g.Sum(x => x.TotalExpenses),
                Net = g.Sum(x => x.Net)
            })
            .OrderBy(x => x.Month)
            .ToList();

        var resultRows = rows
            .Select(x => new AnnualTallyRowDto(
                x.Month,
                new DateTime(start.Year, x.Month, 1).ToString("MMMM"),
                x.EntryCount,
                x.TotalIncome,
                x.TotalExpenses,
                x.Net
            ))
            .ToList();

        decimal expenseTotal = 0;
        if (!string.IsNullOrWhiteSpace(expenseName))
        {
            expenseTotal = records.Sum(record =>
            {
                var payload = NormalizePayload(JsonSerializer.Deserialize<DailyTallyPayloadDto>(record.PayloadJson, _jsonOptions));
                return payload.InternalExpenses
                    .Where(x => string.Equals(x.Name, expenseName, StringComparison.OrdinalIgnoreCase))
                    .Sum(x => x.Value);
            });
        }

        return new AnnualTallyReportResponse(
            year,
            start,
            endExclusive.AddDays(-1),
            resultRows,
            resultRows.Sum(x => x.TotalIncome),
            resultRows.Sum(x => x.TotalExpenses),
            resultRows.Sum(x => x.Net),
            string.IsNullOrWhiteSpace(expenseName) ? null : expenseName,
            expenseTotal
        );
    }

    private static DailyTallyPayloadDto EmptyPayload()
    {
        return new DailyTallyPayloadDto(
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            []
        );
    }

    private static DailyTallyPayloadDto NormalizePayload(DailyTallyPayloadDto? payload)
    {
        if (payload is null)
            return EmptyPayload();

        return new DailyTallyPayloadDto(
            payload.InternalExpenses ?? [],
            payload.ExternalExpenses ?? [],
            payload.PaymentVendors ?? [],
            payload.StaffSalaries ?? [],
            payload.StaffAdvances ?? [],
            payload.ApproximateValues ?? [],
            payload.DailyTallyValues ?? [],
            payload.ActualValues ?? [],
            payload.CashDenominations ?? []
        );
    }
}
