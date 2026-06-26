namespace Billing.Api.Models;

public record CreatePaymentRequest(
    int InvoiceId,
    decimal Amount,
    string Method
);
