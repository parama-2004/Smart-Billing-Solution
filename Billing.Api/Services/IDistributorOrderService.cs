using Billing.Api.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Billing.Api.Services;

public interface IDistributorOrderService
{
	Task<DistributorOrderResponse> CreateAsync(CreateDistributorOrderRequest request);
	Task<List<DistributorOrderResponse>> GetAllAsync();
	Task<DistributorOrderResponse> GetByIdAsync(int orderId);
	Task<DistributorOrderResponse> UpdateStatusAsync(int orderId, DistributorOrderStatus status);
}