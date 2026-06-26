using System;

namespace Billing.Api.Models;


public record DistributorResponse(
    int Id,
    string Name,
    string Address,
    string? Mobile,
    decimal OpeningBalance,
    decimal PurchaseAmount,
    decimal PaidAmount,
    decimal ReturnedAmount,
    decimal ClosingBalance,
    DateTime DateOfJoin
);
