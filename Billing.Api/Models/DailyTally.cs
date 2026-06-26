using System;
using System.Collections.Generic;

namespace Billing.Api.Models;

public class DailyTallyRecord
{
    public int Id { get; set; }
    public DateTime TallyDate { get; set; }
    public string PayloadJson { get; set; } = "{}";
    public decimal TotalIncome { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal Net { get; set; }
    public decimal StatusDifference { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public record TallyValueItemDto(
    string Name,
    decimal Value
);

public record TallyTextItemDto(
    string Name,
    string Value
);

public record TallyVendorItemDto(
    string Name,
    decimal Amount
);

public record CashDenominationItemDto(
    string Name,
    decimal Count,
    decimal Amount
);

public record DailyTallyPayloadDto(
    List<TallyValueItemDto> InternalExpenses,
    List<TallyValueItemDto> ExternalExpenses,
    List<TallyVendorItemDto> PaymentVendors,
    List<SalesmanCompensationEntryRequest> StaffSalaries,
    List<SalesmanCompensationEntryRequest> StaffAdvances,
    List<TallyValueItemDto> ApproximateValues,
    List<TallyValueItemDto> DailyTallyValues,
    List<TallyValueItemDto> ActualValues,
    List<CashDenominationItemDto> CashDenominations
);

public record SaveDailyTallyRequest(
    DateTime TallyDate,
    DailyTallyPayloadDto Payload,
    decimal TotalIncome,
    decimal TotalExpenses,
    decimal Net,
    decimal StatusDifference
);

public record DailyTallyResponseDto(
    int Id,
    DateTime TallyDate,
    DailyTallyPayloadDto Payload,
    decimal TotalIncome,
    decimal TotalExpenses,
    decimal Net,
    decimal StatusDifference,
    DateTime UpdatedAt
);

public record AnnualTallyRowDto(
    int Month,
    string MonthName,
    int EntryCount,
    decimal TotalIncome,
    decimal TotalExpenses,
    decimal Net
);

public record AnnualTallyReportResponse(
    int? Year,
    DateTime FromDate,
    DateTime ToDate,
    List<AnnualTallyRowDto> Rows,
    decimal TotalIncome,
    decimal TotalExpenses,
    decimal Net,
    string? ExpenseName,
    decimal ExpenseTotal
);
