using Billing.Api.Data;
using Billing.Api.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Billing.Api.Services;

public class BrandService : IBrandService
{
    private readonly BillingDbContext _context;

    public BrandService(BillingDbContext context)
    {
        _context = context;
    }

    public async Task<BrandDto> CreateAsync(CreateBrandRequest request)
    {
        // Check if brand code already exists
        if (await _context.Brands.AnyAsync(b => b.BrandCode == request.BrandCode))
            throw new InvalidOperationException($"Brand code '{request.BrandCode}' already exists");

        // Check if brand name already exists
        if (await _context.Brands.AnyAsync(b => b.BrandName == request.BrandName))
            throw new InvalidOperationException($"Brand name '{request.BrandName}' already exists");

        var brand = new Brand
        {
            BrandCode = request.BrandCode.ToUpper().Trim(),
            BrandName = request.BrandName.Trim(),
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _context.Brands.Add(brand);
        await _context.SaveChangesAsync();

        return new BrandDto
        {
            Id = brand.Id,
            BrandCode = brand.BrandCode,
            BrandName = brand.BrandName,
            IsActive = brand.IsActive
        };
    }

    public async Task<BrandDto?> GetByIdAsync(int id)
    {
        var brand = await _context.Brands.FindAsync(id);

        if (brand == null)
            return null;

        return new BrandDto
        {
            Id = brand.Id,
            BrandCode = brand.BrandCode,
            BrandName = brand.BrandName,
            IsActive = brand.IsActive
        };
    }

    public async Task<List<BrandDto>> GetAllAsync()
    {
        return await _context.Brands
            .OrderBy(b => b.BrandName)
            .Select(b => new BrandDto
            {
                Id = b.Id,
                BrandCode = b.BrandCode,
                BrandName = b.BrandName,
                IsActive = b.IsActive
            })
            .ToListAsync();
    }

    public async Task<BrandDto> UpdateAsync(int id, UpdateBrandRequest request)
    {
        var brand = await _context.Brands.FindAsync(id)
            ?? throw new InvalidOperationException("Brand not found");

        // Check if brand name already exists (excluding current brand)
        if (await _context.Brands.AnyAsync(b =>
            b.BrandName == request.BrandName && b.Id != id))
            throw new InvalidOperationException($"Brand name '{request.BrandName}' already exists");

        brand.BrandName = request.BrandName.Trim();
        brand.IsActive = request.IsActive;
        brand.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new BrandDto
        {
            Id = brand.Id,
            BrandCode = brand.BrandCode,
            BrandName = brand.BrandName,
            IsActive = brand.IsActive
        };
    }

    //public async Task<bool> DeleteAsync(int id)
    //{
    //    var brand = await _context.Brands.FindAsync(id);

    //    if (brand == null)
    //        return false;

    //    // Check if brand is used in products
    //    var isUsedInProducts = await _context.Products
    //        .AnyAsync(p => p.BrandId == id);

    //    if (isUsedInProducts)
    //        throw new InvalidOperationException("Cannot delete brand that is used in products");

    //    _context.Brands.Remove(brand);
    //    await _context.SaveChangesAsync();

    //    return true;
    //}

    public async Task<bool> ExistsByCodeAsync(string brandCode)
    {
        return await _context.Brands
            .AnyAsync(b => b.BrandCode == brandCode.ToUpper());
    }

    public async Task<bool> ExistsByNameAsync(string brandName)
    {
        return await _context.Brands
            .AnyAsync(b => b.BrandName == brandName);
    }
}