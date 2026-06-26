using System.Collections.Generic;
using System.Threading.Tasks;
using Billing.Api.Models;
using Billing.Api.Data;


namespace Billing.Api.Services;

public interface ISalesmanService
{
    Task<SalesmanResponse> CreateAsync(CreateSalesmanRequest request);
    Task<List<SalesmanResponse>> GetAllAsync();
    Task<SalesmanResponse> UpdateAsync(int id, CreateSalesmanRequest request);
}
