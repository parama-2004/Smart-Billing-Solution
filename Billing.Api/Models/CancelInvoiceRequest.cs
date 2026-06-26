namespace Billing.Api.Models;

public record CancelInvoiceRequest(
    int InvoiceId,
    string Reason

);
