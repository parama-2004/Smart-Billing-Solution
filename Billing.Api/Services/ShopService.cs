using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Billing.Api.Data;
using Billing.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Billing.Api.Services;

public interface IShopService
{
    Task<List<Shop>> GetAllAsync();
    Task<Shop?> GetByIdAsync(int id);
    Task<Shop> CreateAsync(CreateShopRequest request);
    Task<Shop> UpdateAsync(int id, UpdateShopRequest request);
    Task DeleteAsync(int id);
}

public class ShopService : IShopService
{
    private readonly BillingDbContext _context;

    public ShopService(BillingDbContext context)
    {
        _context = context;
    }

    public async Task<List<Shop>> GetAllAsync()
    {
        return await _context.Shops.ToListAsync();
    }

    public async Task<Shop?> GetByIdAsync(int id)
    {
        return await _context.Shops.FindAsync(id);
    }

    public async Task<Shop> CreateAsync(CreateShopRequest request)
    {
        var shop = new Shop
        {
            Name = request.Name,
            City = request.City
        };

        _context.Shops.Add(shop);
        await _context.SaveChangesAsync();

        return shop;
    }

    public async Task<Shop> UpdateAsync(int id, UpdateShopRequest request)
    {
        var shop = await _context.Shops.FindAsync(id);
        if (shop == null)
            throw new InvalidOperationException($"Shop with ID {id} not found.");

        shop.Name = request.Name;
        shop.City = request.City;

        await _context.SaveChangesAsync();
        return shop;
    }

    public async Task DeleteAsync(int id)
    {
        var shop = await _context.Shops.FindAsync(id);
        if (shop != null)
        {
            _context.Shops.Remove(shop);
            await _context.SaveChangesAsync();
        }
    }
}
