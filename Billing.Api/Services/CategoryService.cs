using Billing.Api.Data;
using Billing.Api.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Billing.Api.Services;

public class CategoryService : ICategoryService
{
    private readonly BillingDbContext _context;

    public CategoryService(BillingDbContext context)
    {
        _context = context;
    }

    public async Task<CategoryDto> CreateAsync(CreateCategoryRequest request)
    {
        // Check if category code already exists
        if (await _context.Categories.AnyAsync(c => c.CategoryCode == request.CategoryCode))
            throw new InvalidOperationException($"Category code '{request.CategoryCode}' already exists");

        // Check if category name already exists
        if (await _context.Categories.AnyAsync(c => c.CategoryName == request.CategoryName))
            throw new InvalidOperationException($"Category name '{request.CategoryName}' already exists");

        var category = new Category
        {
            CategoryCode = request.CategoryCode.ToUpper().Trim(),
            CategoryName = request.CategoryName.Trim(),
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return new CategoryDto
        {
            Id = category.Id,
            CategoryCode = category.CategoryCode,
            CategoryName = category.CategoryName,
            IsActive = category.IsActive
        };
    }

    public async Task<CategoryDto?> GetByIdAsync(int id)
    {
        var category = await _context.Categories.FindAsync(id);

        if (category == null)
            return null;

        return new CategoryDto
        {
            Id = category.Id,
            CategoryCode = category.CategoryCode,
            CategoryName = category.CategoryName,
            IsActive = category.IsActive
        };
    }

    public async Task<List<CategoryDto>> GetAllAsync()
    {
        return await _context.Categories
            .OrderBy(c => c.CategoryName)
            .Select(c => new CategoryDto
            {
                Id = c.Id,
                CategoryCode = c.CategoryCode,
                CategoryName = c.CategoryName,
                IsActive = c.IsActive
            })
            .ToListAsync();
    }

    public async Task<CategoryDto> UpdateAsync(int id, UpdateCategoryRequest request)
    {
        var category = await _context.Categories.FindAsync(id)
            ?? throw new InvalidOperationException("Category not found");

        // Check if category name already exists (excluding current category)
        if (await _context.Categories.AnyAsync(c =>
            c.CategoryName == request.CategoryName && c.Id != id))
            throw new InvalidOperationException($"Category name '{request.CategoryName}' already exists");

        category.CategoryName = request.CategoryName.Trim();
        category.IsActive = request.IsActive;
        category.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new CategoryDto
        {
            Id = category.Id,
            CategoryCode = category.CategoryCode,
            CategoryName = category.CategoryName,
            IsActive = category.IsActive
        };
    }

    //public async Task<bool> DeleteAsync(int id)
    //{
    //    var category = await _context.Categories.FindAsync(id);

    //    if (category == null)
    //        return false;

    //    // Check if category is used in products
    //    var isUsedInProducts = await _context.Products
    //        .AnyAsync(p => p.CategoryId == id);

    //    if (isUsedInProducts)
    //        throw new InvalidOperationException("Cannot delete category that is used in products");

    //    _context.Categories.Remove(category);
    //    await _context.SaveChangesAsync();

    //    return true;
    //}

    public async Task<bool> ExistsByCodeAsync(string categoryCode)
    {
        return await _context.Categories
            .AnyAsync(c => c.CategoryCode == categoryCode.ToUpper());
    }

    public async Task<bool> ExistsByNameAsync(string categoryName)
    {
        return await _context.Categories
            .AnyAsync(c => c.CategoryName == categoryName);
    }
}