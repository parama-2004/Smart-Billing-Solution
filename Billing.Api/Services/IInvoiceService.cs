using Billing.Api.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Billing.Api.Services;

public interface IInvoiceService
{
    Task<InvoiceResponse> CreateAsync(CreateInvoiceRequest request);
    Task<InvoiceResponse> UpdateAsync(int id, UpdateInvoiceRequest request); // Add this
    Task<InvoiceResponse> AdminUpdateAsync(int id, UpdateInvoiceRequest request);
    Task<List<InvoiceResponse>> GetAllAsync();
    Task<InvoiceResponse> CancelAsync(CancelInvoiceRequest request);
    Task<InvoiceResponse?> GetByInvoiceNumberAsync(string invoiceNumber);
    Task<InvoiceResponse?> GetByIdAsync(int invoiceId);
    Task<List<InvoiceResponse>> GetRecentForReprintAsync(int limit, string searchPrefix = "");
    Task<List<InvoiceResponse>> GetHoldInvoicesAsync();
    Task<List<InvoiceResponse>> GetByCustomerIdAsync(int customerId);
    Task<List<InvoiceResponse>> GetBySalesmanIdAsync(int salesmanId);
    Task<List<InvoiceResponse>> GetTodayInvoicesAsync();
    Task<List<InvoiceResponse>> GetByDateRangeAsync(System.DateTime fromDate, System.DateTime toDate);
    Task<object> GetInvoiceSummaryAsync();
}