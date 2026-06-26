
// This code defines an Invoice model for a billing API, including properties for invoice details, status, items, and payments.
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Billing.Api.Models;

// Enum representing the status of an invoice
public enum InvoiceStatus
{
    Unpaid,
    PartiallyPaid,
    Paid,
    Cancelled,
    Refunded,
    Hold,
    PartiallyRefunded
}


// Model representing an invoice
public class Invoice
{
    // Unique identifier for the invoice
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = null!;
    public DateTime Date { get; set; }
    public string CustomerName { get; set; } = null!;
    public decimal TotalAmount { get; set; }

    // Amount that has been paid towards the invoice
    public decimal PaidAmount { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Unpaid;

    // Collection of items associated with the invoice
    public List<InvoiceItem> Items { get; set; } = new();
    public List<Payment> Payments { get; set; } = new();

    // Cancellation details
    public DateTime? CancelledOn { get; set; }
    public string? CancellationReason { get; set; }

    // Refund details
    public decimal RefundedAmount { get; set; }
    public List<Refund> Refunds { get; set; } = new();
    public List<LoyaltyRedemption> LoyaltyRedemptions { get; set; } = new();

    public int? CustomerId { get; set; }          // FK (nullable for old invoices)
    public Customer? Customer { get; set; }       // Navigation property

    public int? SalesmanId { get; set; }
    public Salesman? Salesman { get; set; }
    // SAFETY FLAGS
    public bool IsPostedToCustomerLedger { get; set; }

   

}
