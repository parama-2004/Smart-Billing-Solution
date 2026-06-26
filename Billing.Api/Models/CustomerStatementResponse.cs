using System;
using System.Collections.Generic;

namespace Billing.Api.Models;

public record CustomerStatementResponse(
    int CustomerId,
    string CustomerCode,
    string CustomerName,
    DateTime FromDate,
    DateTime ToDate,
    decimal OpeningBalance,
    decimal ClosingBalance,
    List<CustomerStatementEntry> Entries
);
