using Billing.Api.Data;
using Billing.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Billing.Api.Services;

public class BankService : IBankService
{
    private readonly BillingDbContext _context;

    public BankService(BillingDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Bank>> GetAllAsync()
    {
        return await _context.Banks.OrderBy(b => b.Name).ToListAsync();
    }

    public async Task<Bank?> GetByIdAsync(int id)
    {
        return await _context.Banks.FindAsync(id);
    }

    public async Task<Bank> CreateAsync(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Bank name is required.");

        var bank = new Bank { Name = name.Trim() };
        _context.Banks.Add(bank);
        await _context.SaveChangesAsync();
        return bank;
    }

    public async Task<Bank> UpdateAsync(int id, string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Bank name is required.");

        var bank = await _context.Banks.FindAsync(id);
        if (bank == null)
            throw new InvalidOperationException($"Bank with ID {id} not found.");

        bank.Name = name.Trim();
        await _context.SaveChangesAsync();
        return bank;
    }

    public async Task DeleteAsync(int id)
    {
        var bank = await _context.Banks.FindAsync(id);
        if (bank != null)
        {
            _context.Banks.Remove(bank);
            await _context.SaveChangesAsync();
        }
    }
}
