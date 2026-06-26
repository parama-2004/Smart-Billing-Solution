using Billing.Api.Models;

namespace Billing.Api.Services;

public interface IBankService
{
    Task<IEnumerable<Bank>> GetAllAsync();
    Task<Bank?> GetByIdAsync(int id);
    Task<Bank> CreateAsync(string name);
    Task<Bank> UpdateAsync(int id, string name);
    Task DeleteAsync(int id);
}
