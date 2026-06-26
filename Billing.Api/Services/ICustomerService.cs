using Billing.Api.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Billing.Api.Services;

public interface ICustomerService
{

    Task<CustomerLedgerSummaryResponse> GetLedgerSummaryAsync(int customerId);
    Task<CustomerLedgerSummaryResponse> GetLedgerCCAsync(int customerId);
    Task<CustomerResponse> CreateAsync(CreateCustomerRequest request);
    Task<List<CustomerResponse>> GetAllAsync();
    Task<CustomerStatementResponse> GetStatementAsync(
    int customerId,
    DateTime fromDate,
    DateTime toDate
);
    Task<CustomerResponse> UpdateAsync(int customerId, UpdateCustomerRequest r);

}