using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Billing.Api.Models;

public class Customer
{
    public int Id { get; set; }   // Internal DB key

    // ===== Identity =====
    [Required]
    [MaxLength(5)]
    public string CustomerCode { get; set; } = null!; // 5-digit human-readable code

    // ===== Required Fields =====
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = null!;

    [Required]
    [MaxLength(15)]
    public string Mobile { get; set; } = null!;

    [Required]
    [MaxLength(250)]
    public string Address { get; set; } = null!;

    // ===== Optional Fields =====
    [MaxLength(15)]
    public string? Telephone { get; set; }

    [MaxLength(100)]
    public string? Email { get; set; }

    // ===== Ledger Amounts =====
    public decimal OpeningBalance { get; set; } = 0;
    public decimal ClosingBalance { get; set; } = 0;

    // Total value of all invoices (sales)
    public decimal PurchaseAmount { get; set; } = 0;

    // Total value of all refunds / returns
    public decimal ReturnedAmount { get; set; } = 0;

    // ===== Loyalty =====
    public int LoyaltyPoints { get; set; } = 0;

    // ===== Dates =====
    public DateTime DateOfJoin { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiryDate { get; set; }

    // ===== Navigation =====
    public List<Invoice> Invoices { get; set; } = new();

    

}
