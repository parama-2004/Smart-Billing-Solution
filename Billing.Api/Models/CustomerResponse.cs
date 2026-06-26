namespace Billing.Api.Models;

public record CustomerResponse(
    int Id,
    string CustomerCode,
    string Name,
    string Mobile,
    string Address,
    string? Telephone,
    string? Email,
    decimal OpeningBalance,
    decimal ClosingBalance,
    decimal PurchaseAmount,
    decimal ReturnedAmount,
    int LoyaltyPoints
);
