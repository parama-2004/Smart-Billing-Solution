using System.ComponentModel.DataAnnotations;

namespace Billing.Api.Models;

public enum LoyaltyRedemptionType
{
    Discount,
    Gift
}

public class GiftProduct
{
    public int Id { get; set; }

    [Required]
    [StringLength(150)]
    public string ProductName { get; set; } = string.Empty;

    public int RequiredPoints { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}

public class LoyaltyRedemption
{
    public int Id { get; set; }

    public int InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    public int? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    [Required]
    [StringLength(100)]
    public string CustomerName { get; set; } = string.Empty;

    [Required]
    [StringLength(10)]
    public string CustomerCode { get; set; } = string.Empty;

    public LoyaltyRedemptionType Type { get; set; }

    public int PointsUsed { get; set; }

    public decimal DiscountAmount { get; set; }

    [StringLength(150)]
    public string? GiftProductName { get; set; }

    public DateTime RedeemedOn { get; set; } = DateTime.UtcNow;
}

public record CreateGiftProductRequest(
    string ProductName,
    int RequiredPoints,
    bool IsActive
);

public record UpdateGiftProductRequest(
    string ProductName,
    int RequiredPoints,
    bool IsActive
);

public record GiftProductDto(
    int Id,
    string ProductName,
    int RequiredPoints,
    bool IsActive
);

public record LoyaltyRedemptionDto(
    int Id,
    int InvoiceId,
    int? CustomerId,
    string CustomerName,
    string CustomerCode,
    string Type,
    int PointsUsed,
    decimal DiscountAmount,
    string? GiftProductName,
    DateTime RedeemedOn
);
