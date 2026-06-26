using System.Collections.Generic;

namespace Billing.Api.Models;

public record SalesReportRowDto(
    string InvoiceNumber,
    string Date,
    string CustomerName,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal RefundedAmount,
    decimal NetAmount
);

public record SalesReportSummaryDto(
    int InvoiceCount,
    decimal TotalSales,
    decimal TotalPaid,
    decimal TotalRefunded,
    decimal NetSales
);

public record SalesReportResponse(
    SalesReportSummaryDto Summary,
    List<SalesReportRowDto> Rows
);
