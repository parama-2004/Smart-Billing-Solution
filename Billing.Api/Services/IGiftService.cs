using Billing.Api.Models;

namespace Billing.Api.Services;

public interface IGiftService
{
    Task<GiftProductDto> CreateAsync(CreateGiftProductRequest request);
    Task<GiftProductDto> UpdateAsync(int id, UpdateGiftProductRequest request);
    Task<List<GiftProductDto>> GetAllAsync();
    Task<List<LoyaltyRedemptionDto>> GetRedeemedGiftItemsAsync();
}
