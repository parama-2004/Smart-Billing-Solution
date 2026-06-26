using System;
using System.Collections.Generic;

namespace Billing.Api.Models;

public record InvoiceItemResponse(
    int ProductId,
    string ProductName,
    string? HsnCode,
    decimal Quantity,
    decimal MRP,
    decimal GstPercentage,
    decimal UnitPrice,
    decimal LineTotal
);

public record InvoiceResponse(
    int Id,
    string InvoiceNumber,
    int CustomerId,
    string CustomerName,
    DateTime Date,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal Balance,
    string Status,
   
    string? PaymentMode,
    int? SalesmanId,
    List<InvoiceItemResponse> Items,
    int LoyaltyPointsRedeemed = 0,
    decimal LoyaltyDiscountAmount = 0,
    List<LoyaltyRedemptionDto>? RedeemedItems = null
);

