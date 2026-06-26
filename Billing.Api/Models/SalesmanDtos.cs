using System;

namespace Billing.Api.Models;

public record CreateSalesmanRequest(
    string Name,
    DateTime DateOfBirth,
    string Address,
    string City,
    string Mobile,
    DateTime DateOfJoin,
    bool IsActive
);

public record SalesmanResponse(
    int Id,
    string Name,
    string Mobile,
    string City,
    bool IsActive
);
