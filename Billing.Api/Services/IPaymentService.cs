using Billing.Api.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Billing.Api.Services;

public interface IPaymentService
{
    Task<InvoiceResponse> PayAsync(CreatePaymentRequest request);
    Task<List<PaymentResponse>> GetPaymentsForInvoiceAsync(int invoiceId);

}
