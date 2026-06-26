using System;

namespace Billing.Api.Models;

public class SalesmanCompensationEntry
{
    public int Id { get; set; }
    public int SalesmanId { get; set; }
    public Salesman Salesman { get; set; } = null!;
    public DateTime EntryDate { get; set; }
    public string EntryType { get; set; } = null!; // Salary | Advance
    public decimal Amount { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Source { get; set; } = "DailyTally";
}

public record SalesmanCompensationEntryRequest(
    int SalesmanId,
    string SalesmanName,
    decimal Amount
);

public record SalesmanCompensationSummaryDto(
    int SalesmanId,
    string SalesmanName,
    decimal TotalSalary,
    decimal TotalAdvance,
    decimal NetPaid
);

public record SalesmanCompensationDetailDto(
    int Id,
    DateTime EntryDate,
    string EntryType,
    decimal Amount,
    string Source
);
