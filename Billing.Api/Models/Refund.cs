using System;

namespace Billing.Api.Models;

public class Refund
{
    public int Id { get; set; }

    public int InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    public decimal Amount { get; set; }
    public DateTime RefundedOn { get; set; } = DateTime.UtcNow;
    public string Reason { get; set; } = null!;
    public string Method { get; set; } = "Cash";
}
