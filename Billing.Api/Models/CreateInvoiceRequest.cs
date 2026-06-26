using System.Collections.Generic;

namespace Billing.Api.Models;

public record CreateInvoiceItemRequest(
    int ProductId,
    decimal Quantity,
    decimal Rate,     // selling price used
    decimal MRP,
    decimal GstPercentage
);

public record CreateInvoiceRequest(
    int? CustomerId,
    int? SalesmanId,
    List<CreateInvoiceItemRequest> Items,
    string? Status,
    CreateLoyaltyRedemptionRequest? Redemption
);

public record CreateLoyaltyRedemptionRequest(
    string Type,
    int Points,
    string? GiftProductName
);

public class UpdateInvoiceRequest
{
    public int? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public int? SalesmanId { get; set; }
    public string? Status { get; set; }
    public List<UpdateInvoiceItemRequest>? Items { get; set; }
}

public class UpdateInvoiceItemRequest
{
    public int ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal Rate { get; set; }
    public decimal MRP { get; set; }
    public decimal GstPercentage { get; set; }
}