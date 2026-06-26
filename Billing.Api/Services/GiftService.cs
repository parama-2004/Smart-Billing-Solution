using Billing.Api.Data;
using Billing.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Billing.Api.Services;

public class GiftService : IGiftService
{
    private readonly BillingDbContext _context;

    public GiftService(BillingDbContext context)
    {
        _context = context;
    }

    public async Task<GiftProductDto> CreateAsync(CreateGiftProductRequest request)
    {
        var productName = request.ProductName.Trim();
        if (string.IsNullOrWhiteSpace(productName))
            throw new InvalidOperationException("Gift product name is required");

        if (request.RequiredPoints <= 0)
            throw new InvalidOperationException("Required points must be greater than zero");

        var exists = await _context.GiftProducts.AnyAsync(x => x.ProductName == productName);
        if (exists)
            throw new InvalidOperationException("Gift product already exists");

        var gift = new GiftProduct
        {
            ProductName = productName,
            RequiredPoints = request.RequiredPoints,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _context.GiftProducts.Add(gift);
        await _context.SaveChangesAsync();

        return new GiftProductDto(gift.Id, gift.ProductName, gift.RequiredPoints, gift.IsActive);
    }

    public async Task<GiftProductDto> UpdateAsync(int id, UpdateGiftProductRequest request)
    {
        var gift = await _context.GiftProducts.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new InvalidOperationException("Gift product not found");

        var productName = request.ProductName.Trim();
        if (string.IsNullOrWhiteSpace(productName))
            throw new InvalidOperationException("Gift product name is required");

        if (request.RequiredPoints <= 0)
            throw new InvalidOperationException("Required points must be greater than zero");

        var duplicate = await _context.GiftProducts.AnyAsync(x => x.Id != id && x.ProductName == productName);
        if (duplicate)
            throw new InvalidOperationException("Gift product already exists");

        gift.ProductName = productName;
        gift.RequiredPoints = request.RequiredPoints;
        gift.IsActive = request.IsActive;
        gift.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new GiftProductDto(gift.Id, gift.ProductName, gift.RequiredPoints, gift.IsActive);
    }

    public async Task<List<GiftProductDto>> GetAllAsync()
    {
        return await _context.GiftProducts
            .AsNoTracking()
            .OrderBy(x => x.RequiredPoints)
            .ThenBy(x => x.ProductName)
            .Select(x => new GiftProductDto(x.Id, x.ProductName, x.RequiredPoints, x.IsActive))
            .ToListAsync();
    }

    public async Task<List<LoyaltyRedemptionDto>> GetRedeemedGiftItemsAsync()
    {
        return await _context.LoyaltyRedemptions
            .AsNoTracking()
            .Where(x => x.Type == LoyaltyRedemptionType.Gift)
            .OrderByDescending(x => x.RedeemedOn)
            .Select(x => new LoyaltyRedemptionDto(
                x.Id,
                x.InvoiceId,
                x.CustomerId,
                x.CustomerName,
                x.CustomerCode,
                x.Type.ToString(),
                x.PointsUsed,
                x.DiscountAmount,
                x.GiftProductName,
                x.RedeemedOn
            ))
            .ToListAsync();
    }
}
