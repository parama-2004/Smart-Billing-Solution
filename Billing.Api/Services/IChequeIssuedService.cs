using Billing.Api.Models;

namespace Billing.Api.Services;

public interface IChequeIssuedService
{
    Task<ChequeIssuedResponse> CreateAsync(CreateChequeIssuedRequest request);
    Task<ChequeIssuedResponse> UpdateAsync(int id, CreateChequeIssuedRequest request);
    Task<List<ChequeIssuedResponse>> GetByDateRangeAsync(DateTime? fromDate, DateTime? toDate);
}
