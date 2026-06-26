using Billing.Api.Data;
using Billing.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Billing.Api.Services;

public class ChequeIssuedService : IChequeIssuedService
{
    private readonly BillingDbContext _db;

    public ChequeIssuedService(BillingDbContext db)
    {
        _db = db;
    }

    public async Task<ChequeIssuedResponse> CreateAsync(CreateChequeIssuedRequest request)
    {
        var method = ValidateAndNormalize(request);

        var entry = new ChequeIssuedEntry
        {
            VendorName = request.VendorName.Trim(),
            BillDate = request.BillDate.Date,
            BillNo = request.BillNo.Trim(),
            Amount = request.Amount,
            PaymentMethod = method,
            ChequeNumber = method == "cheque" ? request.ChequeNumber?.Trim() : null,
            ChequeDate = method == "cheque" ? request.ChequeDate?.Date : null,
            BankName = method == "cheque" ? request.BankName?.Trim() : null,
            StockReturn = request.StockReturn,
            Remarks = request.Remarks?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _db.ChequeIssuedEntries.Add(entry);
        await _db.SaveChangesAsync();

        return Map(entry);
    }

    public async Task<ChequeIssuedResponse> UpdateAsync(int id, CreateChequeIssuedRequest request)
    {
        var entry = await _db.ChequeIssuedEntries.FindAsync(id)
            ?? throw new InvalidOperationException("Cheque issued entry not found");

        var method = ValidateAndNormalize(request);

        entry.VendorName = request.VendorName.Trim();
        entry.BillDate = request.BillDate.Date;
        entry.BillNo = request.BillNo.Trim();
        entry.Amount = request.Amount;
        entry.PaymentMethod = method;
        entry.ChequeNumber = method == "cheque" ? request.ChequeNumber?.Trim() : null;
        entry.ChequeDate = method == "cheque" ? request.ChequeDate?.Date : null;
        entry.BankName = method == "cheque" ? request.BankName?.Trim() : null;
        entry.StockReturn = request.StockReturn;
        entry.Remarks = request.Remarks?.Trim();

        await _db.SaveChangesAsync();
        return Map(entry);
    }

    public async Task<List<ChequeIssuedResponse>> GetByDateRangeAsync(DateTime? fromDate, DateTime? toDate)
    {
        var query = _db.ChequeIssuedEntries.AsNoTracking().AsQueryable();

        if (fromDate.HasValue)
            query = query.Where(x => x.ChequeDate != null && x.ChequeDate >= fromDate.Value.Date);

        if (toDate.HasValue)
            query = query.Where(x => x.ChequeDate != null && x.ChequeDate <= toDate.Value.Date);

        var rows = await query
            .OrderByDescending(x => x.ChequeDate)
            .ThenByDescending(x => x.Id)
            .ToListAsync();

        return rows.Select(Map).ToList();
    }

    private static ChequeIssuedResponse Map(ChequeIssuedEntry x)
    {
        return new ChequeIssuedResponse(
            x.Id,
            x.VendorName,
            x.BillDate,
            x.BillNo,
            x.Amount,
            x.PaymentMethod,
            x.ChequeNumber,
            x.ChequeDate,
            x.BankName,
            x.StockReturn,
            x.Remarks,
            x.CreatedAt
        );
    }

    private static string ValidateAndNormalize(CreateChequeIssuedRequest request)
    {
        var method = request.PaymentMethod.Trim().ToLowerInvariant();
        if (method is not ("cheque" or "cash" or "credit" or "dd"))
            throw new InvalidOperationException("Invalid payment method");

        if (method == "cheque")
        {
            if (string.IsNullOrWhiteSpace(request.ChequeNumber) || !request.ChequeDate.HasValue || string.IsNullOrWhiteSpace(request.BankName))
                throw new InvalidOperationException("Cheque number, cheque date and bank are required for cheque payment");
        }

        return method;
    }
}
