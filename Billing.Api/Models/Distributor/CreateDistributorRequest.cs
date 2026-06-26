namespace Billing.Api.Models;

public record CreateDistributorRequest(
    string Name,
    string Address,
    string? Mobile,
    string? Telephone,
    string? Email,
    string? GstNumber,
    decimal OpeningBalance,
    DateTime DateofJoin
);