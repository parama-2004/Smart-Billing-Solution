using System.Collections.Generic;
using System.Threading.Tasks;
using Billing.Api.Models;

namespace Billing.Api.Services;

public interface IDistributorService
{
    Task<DistributorResponse> CreateAsync(CreateDistributorRequest request);
    Task<DistributorResponse> UpdateAsync(int id, CreateDistributorRequest request);
    Task<List<DistributorResponse>> GetAllAsync();
}
