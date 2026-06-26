using Billing.Api.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Billing.Api.Services;

public interface IRefundService
{
    Task<InvoiceResponse> RefundAsync(CreateRefundRequest request);
    Task<List<RefundResponse>> GetRefundsForInvoiceAsync(int invoiceId);
}
