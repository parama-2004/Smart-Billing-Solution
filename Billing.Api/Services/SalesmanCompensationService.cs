using Billing.Api.Data;
using Billing.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Billing.Api.Services;

public class SalesmanCompensationService : ISalesmanCompensationService
{
    private readonly BillingDbContext _db;

    public SalesmanCompensationService(BillingDbContext db)
    {
        _db = db;
    }

    public async Task SyncDailyTallyEntriesAsync(
        DateTime date,
        List<SalesmanCompensationEntryRequest> salaries,
        List<SalesmanCompensationEntryRequest> advances)
    {
        var normalizedDate = date.Date;

        var existing = await _db.SalesmanCompensationEntries
            .Where(x => x.EntryDate == normalizedDate && x.Source == "DailyTally")
            .ToListAsync();

        if (existing.Count > 0)
        {
            _db.SalesmanCompensationEntries.RemoveRange(existing);
        }

        var entries = new List<SalesmanCompensationEntry>();

        entries.AddRange(salaries
            .Where(x => x.Amount > 0)
            .Select(x => new SalesmanCompensationEntry
            {
                SalesmanId = x.SalesmanId,
                EntryDate = normalizedDate,
                EntryType = "Salary",
                Amount = x.Amount,
                CreatedAt = DateTime.UtcNow,
                Source = "DailyTally"
            }));

        entries.AddRange(advances
            .Where(x => x.Amount > 0)
            .Select(x => new SalesmanCompensationEntry
            {
                SalesmanId = x.SalesmanId,
                EntryDate = normalizedDate,
                EntryType = "Advance",
                Amount = x.Amount,
                CreatedAt = DateTime.UtcNow,
                Source = "DailyTally"
            }));

        if (entries.Count > 0)
        {
            _db.SalesmanCompensationEntries.AddRange(entries);
        }

        await _db.SaveChangesAsync();
    }

    public async Task<List<SalesmanCompensationSummaryDto>> GetSummaryAsync()
    {
        var rows = await _db.Salesmen
            .AsNoTracking()
            .Select(s => new
            {
                s.Id,
                s.Name,
                TotalSalary = _db.SalesmanCompensationEntries
                    .Where(x => x.SalesmanId == s.Id && x.EntryType == "Salary")
                    .Select(x => (decimal?)x.Amount)
                    .Sum() ?? 0,
                TotalAdvance = _db.SalesmanCompensationEntries
                    .Where(x => x.SalesmanId == s.Id && x.EntryType == "Advance")
                    .Select(x => (decimal?)x.Amount)
                    .Sum() ?? 0
            })
            .OrderBy(x => x.Name)
            .ToListAsync();

        return rows.Select(x => new SalesmanCompensationSummaryDto(
            x.Id,
            x.Name,
            x.TotalSalary,
            x.TotalAdvance,
            x.TotalSalary + x.TotalAdvance
        )).ToList();
    }

    public async Task<List<SalesmanCompensationDetailDto>> GetDetailsBySalesmanAsync(int salesmanId)
    {
        return await _db.SalesmanCompensationEntries
            .AsNoTracking()
            .Where(x => x.SalesmanId == salesmanId)
            .OrderByDescending(x => x.EntryDate)
            .ThenByDescending(x => x.Id)
            .Select(x => new SalesmanCompensationDetailDto(
                x.Id,
                x.EntryDate,
                x.EntryType,
                x.Amount,
                x.Source
            ))
            .ToListAsync();
    }
}
