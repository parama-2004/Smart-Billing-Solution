using System;
using System.Threading.Tasks;
using Billing.Api.Data;
using Billing.Api.Models;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;


namespace Billing.Api.Services;

public class SalesReportService : ISalesReportService
{
    private readonly BillingDbContext _db;

    public SalesReportService(BillingDbContext db)
    {
        _db = db;
    }
    public async Task<SalesReportResponse> GetSalesReport(
    DateTime from, DateTime to)
    {
        var invoices = await _db.Invoices
            .Where(i => i.Date >= from && i.Date <= to)
            .Where(i => i.Status != InvoiceStatus.Cancelled)
            .ToListAsync();

        var rows = invoices.Select(i =>
        {
            var refundedAmount = i.RefundedAmount;
            var netAmount = i.TotalAmount < 0
                ? i.TotalAmount
                : i.TotalAmount - refundedAmount;

            return new SalesReportRowDto(
                i.InvoiceNumber,
                i.Date.ToString("dd-MM-yyyy"),
                i.CustomerName,
                i.TotalAmount,
                i.PaidAmount,
                refundedAmount,
                netAmount
            );
        }).ToList();

        var summary = new SalesReportSummaryDto(
            invoices.Count,
            rows.Sum(r => r.TotalAmount),
            rows.Sum(r => r.PaidAmount),
            rows.Sum(r => r.RefundedAmount),
            rows.Sum(r => r.NetAmount)
        );

        return new SalesReportResponse(summary, rows);
    }

    public async Task<VatReportResponse> GetSalesVatReport(DateTime from, DateTime to)
    {
        var vatRows = await _db.SalesVat
            .Where(x => x.Date >= from && x.Date <= to)
            .OrderByDescending(x => x.Date)
            .ToListAsync();

        var rows = vatRows.Select(x => new VatReportRowDto(
            x.InvoiceNumber,
            x.Date.ToString("dd-MM-yyyy"),
            x.CustomerName,
            x.TaxableAmount,
            x.VatAmount,
            x.TotalAmount
        )).ToList();

        var summary = new VatReportSummaryDto(
            rows.Count,
            rows.Sum(x => x.TaxableAmount),
            rows.Sum(x => x.VatAmount),
            rows.Sum(x => x.TotalAmount)
        );

        return new VatReportResponse(summary, rows);
    }

    public async Task<VatReportResponse> GetPurchaseVatReport(DateTime from, DateTime to)
    {
        var vatRows = await _db.PurchaseVat
            .Where(x => x.Date >= from && x.Date <= to)
            .OrderByDescending(x => x.Date)
            .ToListAsync();

        var rows = vatRows.Select(x => new VatReportRowDto(
            x.InvoiceNo,
            x.Date.ToString("dd-MM-yyyy"),
            x.DistributorName,
            x.TaxableAmount,
            x.VatAmount,
            x.TotalAmount
        )).ToList();

        var summary = new VatReportSummaryDto(
            rows.Count,
            rows.Sum(x => x.TaxableAmount),
            rows.Sum(x => x.VatAmount),
            rows.Sum(x => x.TotalAmount)
        );

        return new VatReportResponse(summary, rows);
    }

    /* -------------------------------------------------------
       SALES GST REPORT — with CGST / SGST % split details
    ------------------------------------------------------- */
    public async Task<GstReportResponse> GetSalesGstReport(DateTime from, DateTime to)
    {
        // Fetch invoices with items in the date range (exclude cancelled)
        var invoices = await _db.Invoices
            .Include(i => i.Items)
            .Where(i => i.Date >= from && i.Date <= to)
            .Where(i => i.Status != InvoiceStatus.Cancelled)
            .OrderByDescending(i => i.Date)
            .ToListAsync();

        var rows = new List<GstReportRowDto>();

        foreach (var inv in invoices)
        {
            // Group items by GST percentage
            var slabs = inv.Items
                .GroupBy(item => item.GstPercentage)
                .Select(g =>
                {
                    var gstPct = g.Key;
                    // Compute taxable amount (GST-exclusive base) for this slab
                    var slabTaxable = g.Sum(item =>
                    {
                        var factor = 1 + (item.GstPercentage / 100m);
                        return factor <= 0 ? item.LineTotal : item.LineTotal / factor;
                    });
                    var slabTotalGst = g.Sum(item => item.LineTotal) - slabTaxable;
                    var cgst = Math.Round(slabTotalGst / 2m, 2);
                    var sgst = Math.Round(slabTotalGst - cgst, 2); // Handles rounding remainder

                    return new GstSlabDto(gstPct, Math.Round(slabTaxable, 2), cgst, sgst, Math.Round(slabTotalGst, 2));
                })
                .OrderBy(s => s.GstPercentage)
                .ToList();

            var rowTaxable = slabs.Sum(s => s.TaxableAmount);
            var rowCgst = slabs.Sum(s => s.CgstAmount);
            var rowSgst = slabs.Sum(s => s.SgstAmount);
            var rowTotalGst = slabs.Sum(s => s.TotalGst);

            rows.Add(new GstReportRowDto(
                inv.InvoiceNumber,
                inv.Date.ToString("dd-MM-yyyy"),
                inv.CustomerName,
                rowTaxable,
                rowCgst,
                rowSgst,
                rowTotalGst,
                inv.TotalAmount,
                slabs
            ));
        }

        // Build overall summary with aggregated slabs
        var allSlabs = rows.SelectMany(r => r.Slabs)
            .GroupBy(s => s.GstPercentage)
            .Select(g => new GstSlabDto(
                g.Key,
                g.Sum(s => s.TaxableAmount),
                g.Sum(s => s.CgstAmount),
                g.Sum(s => s.SgstAmount),
                g.Sum(s => s.TotalGst)
            ))
            .OrderBy(s => s.GstPercentage)
            .ToList();

        var summary = new GstReportSummaryDto(
            rows.Count,
            rows.Sum(r => r.TaxableAmount),
            rows.Sum(r => r.CgstAmount),
            rows.Sum(r => r.SgstAmount),
            rows.Sum(r => r.TotalGst),
            rows.Sum(r => r.TotalAmount),
            allSlabs
        );

        return new GstReportResponse(summary, rows);
    }

    /* -------------------------------------------------------
       PURCHASE GST REPORT — with CGST / SGST % split details
    ------------------------------------------------------- */
    public async Task<GstReportResponse> GetPurchaseGstReport(DateTime from, DateTime to)
    {
        // Fetch purchases with items in the date range (exclude cancelled)
        var purchases = await _db.PurchaseEntry
            .Include(p => p.Items)
            .Where(p => p.Date >= from && p.Date <= to)
            .Where(p => p.Status != PaymentStatus.Cancelled)
            .OrderByDescending(p => p.Date)
            .ToListAsync();

        var rows = new List<GstReportRowDto>();

        foreach (var pur in purchases)
        {
            // Group items by GST percentage
            var slabs = pur.Items
                .GroupBy(item => item.GstPercentage)
                .Select(g =>
                {
                    var gstPct = g.Key;
                    // For purchases, taxable = UnitPrice * Qty - Discount (GST-exclusive already)
                    var slabTaxable = g.Sum(item =>
                    {
                        var baseVal = item.UnitPrice * item.Quantity;
                        return baseVal - item.DiscountAmount;
                    });
                    var slabTotalGst = g.Sum(item => item.GstAmount);
                    var cgst = Math.Round(slabTotalGst / 2m, 2);
                    var sgst = Math.Round(slabTotalGst - cgst, 2);

                    return new GstSlabDto(gstPct, Math.Round(slabTaxable, 2), cgst, sgst, Math.Round(slabTotalGst, 2));
                })
                .OrderBy(s => s.GstPercentage)
                .ToList();

            var rowTaxable = slabs.Sum(s => s.TaxableAmount);
            var rowCgst = slabs.Sum(s => s.CgstAmount);
            var rowSgst = slabs.Sum(s => s.SgstAmount);
            var rowTotalGst = slabs.Sum(s => s.TotalGst);

            rows.Add(new GstReportRowDto(
                pur.InvoiceNo,
                pur.Date.ToString("dd-MM-yyyy"),
                pur.DistributorName,
                rowTaxable,
                rowCgst,
                rowSgst,
                rowTotalGst,
                pur.TotalAmount,
                slabs
            ));
        }

        // Build overall summary with aggregated slabs
        var allSlabs = rows.SelectMany(r => r.Slabs)
            .GroupBy(s => s.GstPercentage)
            .Select(g => new GstSlabDto(
                g.Key,
                g.Sum(s => s.TaxableAmount),
                g.Sum(s => s.CgstAmount),
                g.Sum(s => s.SgstAmount),
                g.Sum(s => s.TotalGst)
            ))
            .OrderBy(s => s.GstPercentage)
            .ToList();

        var summary = new GstReportSummaryDto(
            rows.Count,
            rows.Sum(r => r.TaxableAmount),
            rows.Sum(r => r.CgstAmount),
            rows.Sum(r => r.SgstAmount),
            rows.Sum(r => r.TotalGst),
            rows.Sum(r => r.TotalAmount),
            allSlabs
        );

        return new GstReportResponse(summary, rows);
    }

}