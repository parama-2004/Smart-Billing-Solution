using Billing.Api.Data;
using Billing.Api.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Billing.Api.Services;

public class PaymentService : IPaymentService
{
    private readonly BillingDbContext _context;

    public PaymentService(BillingDbContext context)
    {
        _context = context;
    }

    /* ---------------------------------------------------------
       Get payments for an invoice
    --------------------------------------------------------- */
    public async Task<List<PaymentResponse>> GetPaymentsForInvoiceAsync(int invoiceId)
    {
        var invoiceExists = await _context.Invoices
            .AnyAsync(i => i.Id == invoiceId);

        if (!invoiceExists)
            throw new InvalidOperationException("Invoice not found");

        return await _context.Payments
            .AsNoTracking()
            .Where(p => p.InvoiceId == invoiceId)
            .OrderBy(p => p.PaidOn)
            .Select(p => new PaymentResponse(
                p.Id,
                p.Amount,
                p.Method,
                p.PaidOn
            ))
            .ToListAsync();
    }

    /* ---------------------------------------------------------
       Pay an invoice
    --------------------------------------------------------- */
    public async Task<InvoiceResponse> PayAsync(CreatePaymentRequest request)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Items)
                .ThenInclude(ii => ii.Product)
            .Include(i => i.Payments)
            .Include(i => i.Customer)
            .FirstOrDefaultAsync(i => i.Id == request.InvoiceId)
            ?? throw new InvalidOperationException("Invoice not found");

        var balance = invoice.TotalAmount - invoice.PaidAmount;

        //if (request.Amount <= 0)
        //    throw new InvalidOperationException("Payment amount must be positive");

        if (request.Amount > balance)
            throw new InvalidOperationException("Payment exceeds outstanding balance");

        var payment = new Payment
        {
            InvoiceId = invoice.Id,
            Amount = request.Amount,
            Method = request.Method,
            PaidOn = DateTime.UtcNow
        };

        invoice.Payments.Add(payment);
        invoice.PaidAmount += request.Amount;

        invoice.Status =
            invoice.PaidAmount == invoice.TotalAmount
                ? InvoiceStatus.Paid
                : InvoiceStatus.PartiallyPaid;

        // -------------------------------
        // Post to customer ledger ONLY ONCE
        // -------------------------------
        if (invoice.Status == InvoiceStatus.Paid &&
            invoice.Customer != null &&
            !invoice.IsPostedToCustomerLedger)
        {
            invoice.Customer.PurchaseAmount += invoice.TotalAmount;

            int loyaltyPoints = (int)(invoice.TotalAmount / 100);
            invoice.Customer.LoyaltyPoints += loyaltyPoints;

            invoice.Customer.ClosingBalance =
                invoice.Customer.OpeningBalance +
                invoice.Customer.PurchaseAmount -
                invoice.Customer.ReturnedAmount;

            invoice.IsPostedToCustomerLedger = true;
        }

        await _context.SaveChangesAsync();

        var redeemedItems = await _context.LoyaltyRedemptions
            .AsNoTracking()
            .Where(x => x.InvoiceId == invoice.Id)
            .OrderBy(x => x.Id)
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

        var loyaltyPointsRedeemed = redeemedItems.Sum(x => x.PointsUsed);
        var loyaltyDiscountAmount = redeemedItems.Sum(x => x.DiscountAmount);

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
          
            payment.Method, // ✅ CURRENT PAYMENT MODE
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
            ).ToList(),
            loyaltyPointsRedeemed,
            loyaltyDiscountAmount,
            redeemedItems
        );
    }
}
