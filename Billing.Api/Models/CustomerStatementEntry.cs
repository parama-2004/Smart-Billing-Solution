using System;

namespace Billing.Api.Models;

public record CustomerStatementEntry(
    DateTime Date,
    string Reference,
    string Type,           // Invoice / Payment / Refund
    decimal Debit,          // Customer owes (invoice)
    decimal Credit,         // Customer paid / refunded
    decimal Balance         // Running balance
);
