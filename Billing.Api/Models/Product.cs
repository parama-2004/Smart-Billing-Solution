using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Billing.Api.Models;

public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public decimal Price { get; set; }
    public decimal MRP { get; set; }
    public decimal CostPrice { get; set; }
    public decimal GstPercentage { get; set; }
    public int Stock { get; set; } = 0;
    public int DistributorId { get; set; }

    // Add brand and category codes
    public string? BrandCode { get; set; }
    public string? CategoryCode { get; set; }

    public string? HsnCode { get; set; }

    [JsonIgnore]
    public Distributor Distributor { get; set; } = null!;

    [JsonIgnore]
    public ICollection<Barcode> Barcodes { get; set; } = new List<Barcode>();
}

public record CreateProductRequest(
    string Name,
    decimal Price,
    int DistributorId,
    int Stock,
    decimal MRP,
    decimal CostPrice,
    decimal GstPercentage,
    string? HsnCode,
    string? BrandCode,
    string? CategoryCode
);
