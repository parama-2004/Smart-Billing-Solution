using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Billing.Api.Models;

public class SalesVat
{
    [Key]
    public int Id { get; set; }

    public int InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    [Required]
    [StringLength(50)]
    public string InvoiceNumber { get; set; } = string.Empty;

    public DateTime Date { get; set; }

    [StringLength(120)]
    public string CustomerName { get; set; } = string.Empty;

    public decimal TaxableAmount { get; set; }
    public decimal VatAmount { get; set; }
    public decimal TotalAmount { get; set; }
}

public class PurchaseVat
{
    [Key]
    public int Id { get; set; }

    public int PurchaseId { get; set; }
    public PurchaseEntry Purchase { get; set; } = null!;

    [Required]
    [StringLength(50)]
    public string InvoiceNo { get; set; } = string.Empty;

    public DateTime Date { get; set; }

    [StringLength(120)]
    public string DistributorName { get; set; } = string.Empty;

    public decimal TaxableAmount { get; set; }
    public decimal VatAmount { get; set; }
    public decimal TotalAmount { get; set; }
}

// --- Legacy DTOs (kept for backward compat) ---
public record VatReportRowDto(
    string ReferenceNo,
    string Date,
    string PartyName,
    decimal TaxableAmount,
    decimal VatAmount,
    decimal TotalAmount
);

public record VatReportSummaryDto(
    int Count,
    decimal TaxableAmount,
    decimal VatAmount,
    decimal TotalAmount
);

public record VatReportResponse(
    VatReportSummaryDto Summary,
    List<VatReportRowDto> Rows
);

// --- New GST DTOs with % split details ---

/// <summary>Breakdown of GST for a single rate slab (e.g. 5%, 12%, 18%, 28%)</summary>
public record GstSlabDto(
    decimal GstPercentage,
    decimal TaxableAmount,
    decimal CgstAmount,
    decimal SgstAmount,
    decimal TotalGst
);

/// <summary>One row in the GST report — per invoice/purchase</summary>
public record GstReportRowDto(
    string ReferenceNo,
    string Date,
    string PartyName,
    decimal TaxableAmount,
    decimal CgstAmount,
    decimal SgstAmount,
    decimal TotalGst,
    decimal TotalAmount,
    List<GstSlabDto> Slabs
);

/// <summary>Summary totals for the GST report</summary>
public record GstReportSummaryDto(
    int Count,
    decimal TaxableAmount,
    decimal CgstAmount,
    decimal SgstAmount,
    decimal TotalGst,
    decimal TotalAmount,
    List<GstSlabDto> Slabs
);

/// <summary>Complete GST report response</summary>
public record GstReportResponse(
    GstReportSummaryDto Summary,
    List<GstReportRowDto> Rows
);
