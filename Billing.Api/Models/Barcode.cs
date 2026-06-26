using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Billing.Api.Models;

public class Barcode
{
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string BarcodeValue { get; set; } = null!;

    public int ProductId { get; set; }

    // Barcode-specific pricing (allows different prices/MRP for same product with different barcodes)
    public decimal Price { get; set; }
    public decimal MRP { get; set; }
    public decimal CostPrice { get; set; }

    // Optional: Track which variant/batch this barcode represents
    public string? Variant { get; set; }
    public string? BatchNumber { get; set; }
    public decimal GSTPercentage { get; set; }

    // Metadata
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ModifiedAt { get; set; }
    public bool IsActive { get; set; } = true;

    [JsonIgnore]
    public Product Product { get; set; } = null!;
}

public record BarcodeMasterResponse(
    int Id,
    string BarcodeValue,
    int ProductId,
    string ProductName,
    decimal Price,
    decimal MRP,
    decimal CostPrice,
    string? Variant,
    string? BatchNumber,
    decimal GSTPercentage,
    DateTime CreatedAt,
    bool IsActive
);

public record CreateBarcodeRequest(
    string BarcodeValue,
    int ProductId,
    decimal Price,
    decimal MRP,
    decimal CostPrice,
    decimal GSTPercentage = 0,
    string? Variant = null,
    string? BatchNumber = null
);

public record UpdateBarcodeRequest(
    string BarcodeValue,
    decimal Price,
    decimal MRP,
    decimal CostPrice,
    decimal GSTPercentage = 0,
    string? Variant = null,
    string? BatchNumber = null,
    bool IsActive = true
);
