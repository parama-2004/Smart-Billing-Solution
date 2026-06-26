using Billing.Api.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Billing.Api.Services;

public interface IBrandService
{
    Task<BrandDto> CreateAsync(CreateBrandRequest request);
    Task<BrandDto?> GetByIdAsync(int id);
    Task<List<BrandDto>> GetAllAsync();
    Task<BrandDto> UpdateAsync(int id, UpdateBrandRequest request);
    //Task<bool> DeleteAsync(int id);
    Task<bool> ExistsByCodeAsync(string brandCode);
    Task<bool> ExistsByNameAsync(string brandName);
}