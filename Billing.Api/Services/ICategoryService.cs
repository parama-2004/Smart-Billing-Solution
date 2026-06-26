using Billing.Api.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Billing.Api.Services;

public interface ICategoryService
{
    Task<CategoryDto> CreateAsync(CreateCategoryRequest request);
    Task<CategoryDto?> GetByIdAsync(int id);
    Task<List<CategoryDto>> GetAllAsync();
    Task<CategoryDto> UpdateAsync(int id, UpdateCategoryRequest request);
   // Task<bool> DeleteAsync(int id);
    Task<bool> ExistsByCodeAsync(string categoryCode);
    Task<bool> ExistsByNameAsync(string categoryName);
}