using System;

namespace Billing.Api.Models;

public record CustomerLedgerSummaryResponse(
    int CustomerId,
    string CustomerCode,
    string Name,
    string Mobile,
    string Address,
    string? Telephone,
    string? Email,

    DateTime DateofJoin,
    DateTime? ExpiryDate,
    decimal OpeningBalance,
    decimal PurchaseAmount,
    decimal PaidAmount,
    decimal ReturnedAmount,
    decimal ClosingBalance,
    int LoyaltyPoints
);
