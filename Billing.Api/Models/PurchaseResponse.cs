
// Response DTOs
using System;
using System.Collections.Generic;

namespace Billing.Api.Models;

public class PurchaseResponse
{
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public int DistributorId { get; set; }
    public string DistributorName { get; set; } = string.Empty;
    public string InvoiceNo { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public PurchaseType Type { get; set; }
    public decimal SubTotal { get; set; }
    public decimal GstTotal { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
    public PaymentStatus Status { get; set; }
    public List<PurchaseItemResponse> Items { get; set; } = new();
    public List<PurchasePaymentResponse> Payments { get; set; } = new();
    public decimal Discount { get; set; }
    public decimal OtherCharges { get; set; }
    public decimal RoundOff { get; set; }
}

public class PurchaseItemResponse
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? HsnCode { get; set; }
    public string? BrandCode { get; set; }
    public string? CategoryCode { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal PurchaseRate { get; set; }
    public decimal Mrp { get; set; }
    public decimal GstPercentage { get; set; }

    public string DiscountType { get; set; } = "percentage";
    public decimal DiscountValue { get; set; }
    public decimal DiscountAmount { get; set; }

    public decimal GstAmount { get; set; }
    public decimal LineTotal { get; set; }
}

public class PurchasePaymentResponse
{
    public int Id { get; set; }
    public PaymentMode Mode { get; set; }
    public string? ChequeNo { get; set; }
    public DateTime? ChequeDate { get; set; }
    public string? BankName { get; set; }
    public DateTime PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public string? Remarks { get; set; }
    public PaymentStatus Status { get; set; }
}
public class DailySummaryResponse
{
    public int TotalPurchases { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TotalPaid { get; set; }
    public decimal TotalBalance { get; set; }
}