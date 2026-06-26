using System;

namespace Billing.Api.Models;

public record PaymentResponse(
    int Id,
    decimal Amount,
    string Method,
    DateTime PaidOn
);
