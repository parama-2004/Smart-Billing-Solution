using Billing.Api.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Billing.Api.Services;

public interface IProductService
{
    Task<List<ProductResponse>> GetAllAsync();
    Task<Product> AddAsync(CreateProductRequest request);
    Task<ProductResponse> UpdateAsync(int id, CreateProductRequest request);

}
