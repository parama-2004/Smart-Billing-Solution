using Billing.Api.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Billing.Api.Services;

public interface IPurchaseService
{
    Task<PurchaseResponse> CreatePurchaseAsync(CreatePurchaseRequest request);
    Task<PurchaseResponse?> GetPurchaseByIdAsync(int id);
    Task<List<PurchaseResponse>> GetAllPurchasesAsync();
    Task<List<PurchaseResponse>> GetPurchasesByDateRangeAsync(DateTime startDate, DateTime endDate);
    Task<List<PurchaseResponse>> GetPurchasesByDistributorAsync(int distributorId);
    Task<PurchaseResponse> AddPaymentAsync(int purchaseId, CreatePurchasePaymentRequest request);
    Task<bool> DeletePaymentAsync(int paymentId);
    Task<bool> CancelPurchaseAsync(int purchaseId);
    Task<decimal> GetTotalOutstandingAsync();
    Task<PurchaseResponse> UpdatePurchaseAsync(int id, UpdatePurchaseRequest request);
    Task<DailySummaryResponse> GetTodaySummaryAsync();
}
