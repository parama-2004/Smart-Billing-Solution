namespace Billing.Api.Models;

public record CreateRefundRequest(
    int InvoiceId,
    decimal Amount,
    string Reason,
    string Method
);
