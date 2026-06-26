using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Billing.Api.Models;

public enum PurchaseType
{
    Local,
    Interstate,
    Composite
}

public enum PaymentMode
{
    Cash,
    Cheque,
    DD,
    Credit
}

public enum PaymentStatus
{
    Pending,
    Partial,
    Paid,
    Overdue,
    Cancelled
}

public class PurchaseEntry
{
    [Key]
    public int Id { get; set; }

    [Required]
    public DateTime Date { get; set; }

    [Required]
    public int DistributorId { get; set; }

    [Required]
    [StringLength(100)]
    public string DistributorName { get; set; } = string.Empty;

    [Required]
    [StringLength(50)]
    public string InvoiceNo { get; set; } = string.Empty;

    [Required]
    public DateTime InvoiceDate { get; set; }

    [Required]
    public PurchaseType Type { get; set; }

    public decimal SubTotal { get; set; }
    public decimal GstTotal { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
    public decimal Discount { get; set; }
    public decimal OtherCharges { get; set; }
    public decimal RoundOff { get; set; }

    [Required]
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation property
    public List<PurchaseItem> Items { get; set; } = new();
    public List<PurchasePayment> Payments { get; set; } = new();

}

public class PurchaseItem
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int PurchaseId { get; set; }

    [Required]
    public int ProductId { get; set; }

    [Required]
    [StringLength(200)]
    public string ProductName { get; set; } = string.Empty;

    [StringLength(20)]
    public string? HsnCode { get; set; }

    [StringLength(50)]
    public string? BrandCode { get; set; }

    [StringLength(50)]
    public string? CategoryCode { get; set; }

    [Required]
    public int Quantity { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal UnitPrice { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal PurchaseRate { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Mrp { get; set; }

    [Required]
    [Range(0, 100)]
    public decimal GstPercentage { get; set; }

    [StringLength(10)]
    public string DiscountType { get; set; } = "percentage"; // "percentage" or "amount"

    [Range(0, double.MaxValue)]
    public decimal DiscountValue { get; set; }

    [Range(0, double.MaxValue)]
    public decimal DiscountAmount { get; set; }

    public decimal GstAmount { get; set; }
    public decimal LineTotal { get; set; }

    [JsonIgnore]
    public PurchaseEntry Purchase { get; set; } = null!;
}

public class PurchasePayment
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int PurchaseId { get; set; }

    [Required]
    public PaymentMode Mode { get; set; }

    [StringLength(50)]
    public string? ChequeNo { get; set; }

    public DateTime? ChequeDate { get; set; }

    [StringLength(100)]
    public string? BankName { get; set; }

    [Required]
    public DateTime PaymentDate { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [StringLength(500)]
    public string? Remarks { get; set; }

    [Required]
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    [JsonIgnore]
    public PurchaseEntry Purchase { get; set; } = null!;
}

// Request DTOs
public class CreatePurchaseRequest
{
    [Required]
    public DateTime Date { get; set; }

    [Required]
    public int DistributorId { get; set; }

    [Required]
    [StringLength(100)]
    public string DistributorName { get; set; } = string.Empty;

    [Required]
    [StringLength(50)]
    public string InvoiceNo { get; set; } = string.Empty;

    [Required]
    public DateTime InvoiceDate { get; set; }

    [Required]
    public PurchaseType Type { get; set; }

    [Required]
    [MinLength(1)]
    public List<PurchaseItemRequest> Items { get; set; } = new();

   public decimal Discount { get; set; }
   public decimal OtherCharges { get; set; }
   public decimal RoundOff { get; set; }
   public decimal TotalAmount { get; set; }
}

public class PurchaseItemRequest
{
    [Required]
    public int ProductId { get; set; }

    [Required]
    [StringLength(200)]
    public string ProductName { get; set; } = string.Empty;

    [StringLength(20)]
    public string? HsnCode { get; set; }

    [StringLength(50)]
    public string? BrandCode { get; set; }

    [StringLength(50)]
    public string? CategoryCode { get; set; }

    [Required]
    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal UnitPrice { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal PurchaseRate { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Mrp { get; set; }

    [Required]
    [Range(0, 100)]
    public decimal GstPercentage { get; set; }

    [StringLength(10)]
    public string DiscountType { get; set; } = "percentage";

    [Range(0, double.MaxValue)]
    public decimal DiscountValue { get; set; }



}

public class CreatePurchasePaymentRequest
{
    [Required]
    public PaymentMode Mode { get; set; }

    [StringLength(50)]
    public string? ChequeNo { get; set; }

    public DateTime? ChequeDate { get; set; }

    [StringLength(100)]
    public string? BankName { get; set; }

    [Required]
    public DateTime PaymentDate { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [StringLength(500)]
    public string? Remarks { get; set; }

    public int DistributorId { get; set; }
}



public class UpdatePurchaseRequest
{
    public DateTime Date { get; set; }
    public int DistributorId { get; set; }
    public string DistributorName { get; set; } = string.Empty;
    public string InvoiceNo { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public PurchaseType Type { get; set; }
    public List<PurchaseItemRequest> Items { get; set; } = new();
    public decimal Discount { get; set; }
    public decimal OtherCharges { get; set; }
    public decimal RoundOff { get; set; }
    public decimal TotalAmount { get; set; }
}