namespace Billing.Api.Models;

public record CreateCustomerRequest(
    string Name,
    string Mobile,
    string Address,
    string? Telephone,
    string? Email,
    decimal OpeningBalance
);
