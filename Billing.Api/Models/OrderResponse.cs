using System;
using System.Collections.Generic;

namespace Billing.Api.Models;

public record DistributorOrderItemResponse(
    int Id,
    int OrderId,
    int ProductId,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    decimal TotalPrice,
    string? BarCode,
    string? HsnCode
);


public record DistributorOrderResponse(
    int Id,
    int DistributorId,
    string DistributorCode,
    string DistributorName,
    string DistributorPhone,
    string DistributorAddress,
    string ContactPerson,
    DateTime OrderDate,
    DateTime ExpectedDeliveryDate,
    List<DistributorOrderItemResponse> Items,
    string? Notes,
    string Priority,
    decimal TotalAmount,
    DistributorOrderStatus Status,
    DateTime CreatedAt,
    DateTime UpdatedAt
);