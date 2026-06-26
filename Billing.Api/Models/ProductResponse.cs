namespace Billing.Api.Models;

public record ProductResponse(
    int Id,
    string Name,
    decimal Price,
    int Stock,
    decimal MRP,
    decimal CostPrice,
    decimal GstPercentage,
    int DistributorId,
    string DistributorName,
    string? BarCode,
    string? HsnCode,
    string? BrandCode,
    string? CategoryCode,
    List<BarcodeMasterResponse>? Barcodes = null
);
