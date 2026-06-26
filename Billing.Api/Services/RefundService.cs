using Billing.Api.Data;
using Billing.Api.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Billing.Api.Services;

public class RefundService : IRefundService
{
    private readonly BillingDbContext _context;

    public RefundService(BillingDbContext context)
    {
        _context = context;
    }

    /* ---------------------------------------------------------
       Helper: Latest payment mode
    --------------------------------------------------------- */
    private async Task<string?> GetPaymentModeAsync(int invoiceId)
    {
        return await _context.Payments
            .Where(p => p.InvoiceId == invoiceId)
            .OrderByDescending(p => p.Id)
            .Select(p => p.Method)
            .FirstOrDefaultAsync();
    }

    /* ---------------------------------------------------------
       Refund Invoice
    --------------------------------------------------------- */
    public async Task<InvoiceResponse> RefundAsync(CreateRefundRequest request)
    {
        if (request.Amount <= 0)
            throw new InvalidOperationException("Refund amount must be positive");

        var invoice = await _context.Invoices
            .Include(i => i.Items)
                .ThenInclude(ii => ii.Product)
            .Include(i => i.Refunds)
            .Include(i => i.Customer)
            .FirstOrDefaultAsync(i => i.Id == request.InvoiceId)
            ?? throw new InvalidOperationException("Invoice not found");

        var isNegativeReturnInvoice = invoice.TotalAmount < 0;

        if (!isNegativeReturnInvoice &&
            invoice.Status != InvoiceStatus.Paid &&
            invoice.Status != InvoiceStatus.PartiallyRefunded)
        {
            throw new InvalidOperationException(
                "Only paid or partially refunded invoices can be refunded");
        }

        var refundableAmount = isNegativeReturnInvoice
            ? Math.Abs(invoice.TotalAmount) - invoice.RefundedAmount
            : invoice.PaidAmount - invoice.RefundedAmount;

        if (request.Amount > refundableAmount)
            throw new InvalidOperationException(
                $"Refund amount ({request.Amount}) exceeds refundable amount ({refundableAmount})");

        // Create refund record
        var refund = new Refund
        {
            InvoiceId = invoice.Id,
            Amount = request.Amount,
            Reason = request.Reason,
            Method = request.Method,
            RefundedOn = DateTime.UtcNow
        };

        invoice.Refunds.Add(refund);
        invoice.RefundedAmount += request.Amount;

        invoice.Status = isNegativeReturnInvoice
            ? (invoice.RefundedAmount >= Math.Abs(invoice.TotalAmount)
                ? InvoiceStatus.Refunded
                : InvoiceStatus.PartiallyRefunded)
            : (invoice.RefundedAmount == invoice.PaidAmount
                ? InvoiceStatus.Refunded
                : InvoiceStatus.PartiallyRefunded);

        // Update customer ledger
        if (invoice.Customer != null)
        {
            invoice.Customer.ReturnedAmount += request.Amount;
            invoice.Customer.ClosingBalance =
                invoice.Customer.OpeningBalance +
                invoice.Customer.PurchaseAmount -
                invoice.Customer.ReturnedAmount;
        }

        await _context.SaveChangesAsync();

        var paymentMode = await GetPaymentModeAsync(invoice.Id);

        return new InvoiceResponse(
            invoice.Id,
            invoice.InvoiceNumber,
            invoice.CustomerId ?? 0,
            invoice.CustomerName,
            invoice.Date,
            invoice.TotalAmount,
            invoice.PaidAmount,
            invoice.TotalAmount - invoice.PaidAmount,
            invoice.Status.ToString(),
            paymentMode,
            invoice.SalesmanId,
            invoice.Items.Select(i =>
                new InvoiceItemResponse(
                    i.ProductId,
                    i.Product!.Name,
                    i.HsnCode,
                    i.Quantity,
                    i.MRP,
                    i.GstPercentage,
                    i.UnitPrice,
                    i.LineTotal
                )
            ).ToList()
        );
    }

    /* ---------------------------------------------------------
       Get Refund History
    --------------------------------------------------------- */
    public async Task<List<RefundResponse>> GetRefundsForInvoiceAsync(int invoiceId)
    {
        return await _context.Refunds
            .AsNoTracking()
            .Where(r => r.InvoiceId == invoiceId)
            .OrderBy(r => r.RefundedOn)
            .Select(r => new RefundResponse(
                r.Id,
                r.Amount,
                r.Reason,
                r.Method,
                r.RefundedOn
            ))
            .ToListAsync();
    }
}
