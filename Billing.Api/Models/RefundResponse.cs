using System;

namespace Billing.Api.Models;

public record RefundResponse(
    int Id,
    decimal Amount,
    string Reason,
    string Method,
    DateTime RefundedOn
);
