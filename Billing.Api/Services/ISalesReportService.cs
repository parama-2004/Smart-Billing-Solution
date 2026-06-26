using Billing.Api.Data;
using Billing.Api.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;


namespace Billing.Api.Services;

public interface ISalesReportService
{
    Task<SalesReportResponse> GetSalesReport(DateTime from, DateTime to);
    Task<VatReportResponse> GetSalesVatReport(DateTime from, DateTime to);
    Task<VatReportResponse> GetPurchaseVatReport(DateTime from, DateTime to);
    Task<GstReportResponse> GetSalesGstReport(DateTime from, DateTime to);
    Task<GstReportResponse> GetPurchaseGstReport(DateTime from, DateTime to);
}
