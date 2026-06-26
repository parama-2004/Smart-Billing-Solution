using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Billing.Api.Models;

public class Distributor
{
    public int Id { get; set; }

    // Required
    public string Name { get; set; } = null!;
    public string Address { get; set; } = null!;

    // Optional
    public string? Mobile { get; set; }
    public string? Telephone { get; set; }
    public string? Email { get; set; }
    public string? GstNumber { get; set; }

    // Ledger fields
    public decimal OpeningBalance { get; set; } = 0;
    public decimal PurchaseAmount { get; set; } = 0;
    public decimal PaidAmount { get; set; } = 0;
    public decimal ReturnedAmount { get; set; } = 0;
    public decimal ClosingBalance { get; set; } = 0;

    public DateTime DateOfJoin { get; set; } = DateTime.UtcNow;

    // Navigation
    [JsonIgnore] // ⬅️ VERY IMPORTANT
    public List<Product> Products { get; set; } = new();
}
