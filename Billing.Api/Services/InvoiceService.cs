using Billing.Api.Data;
using Billing.Api.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Billing.Api.Services;

public class InvoiceService : IInvoiceService
{
    private readonly BillingDbContext _context;

    public InvoiceService(BillingDbContext context)
    {
        _context = context;
    }

    /* ---------------------------------------------------------
       HELPER: Get latest payment mode for an invoice
    --------------------------------------------------------- */
    private async Task<string?> GetPaymentModeAsync(int invoiceId)
    {
        return await _context.Payments
            .Where(p => p.InvoiceId == invoiceId)
            .OrderByDescending(p => p.Id)
            .Select(p => p.Method)
            .FirstOrDefaultAsync();
    }

    private static List<InvoiceItemResponse> MapInvoiceItems(Invoice invoice)
    {
        return invoice.Items.Select(i =>
            new InvoiceItemResponse(
                ProductId: i.ProductId,
                ProductName: i.Product!.Name,
                HsnCode: i.HsnCode,
                Quantity: i.Quantity,
                MRP: i.MRP,
                GstPercentage: i.GstPercentage,
                UnitPrice: i.UnitPrice,
                LineTotal: i.LineTotal
            )
        ).ToList();
    }

    private async Task<List<LoyaltyRedemptionDto>> GetRedemptionDtosAsync(int invoiceId)
    {
        return await _context.LoyaltyRedemptions
            .AsNoTracking()
            .Where(x => x.InvoiceId == invoiceId)
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
    }

    private async Task<InvoiceResponse> BuildInvoiceResponseAsync(Invoice invoice, string? paymentMode)
    {
        var redeemedItems = await GetRedemptionDtosAsync(invoice.Id);
        var totalPointsRedeemed = redeemedItems.Sum(x => x.PointsUsed);
        var totalDiscountAmount = redeemedItems.Sum(x => x.DiscountAmount);

        return new InvoiceResponse(
            Id: invoice.Id,
            InvoiceNumber: invoice.InvoiceNumber,
            CustomerId: invoice.CustomerId ?? 0,
            CustomerName: invoice.CustomerName,
            Date: invoice.Date,
            TotalAmount: invoice.TotalAmount,
            PaidAmount: invoice.PaidAmount,
            Balance: invoice.TotalAmount - invoice.PaidAmount,
            Status: invoice.Status.ToString(),
            PaymentMode: paymentMode,
            SalesmanId: invoice.SalesmanId,
            Items: MapInvoiceItems(invoice),
            LoyaltyPointsRedeemed: totalPointsRedeemed,
            LoyaltyDiscountAmount: totalDiscountAmount,
            RedeemedItems: redeemedItems
        );
    }

    private static (decimal taxableAmount, decimal vatAmount, decimal totalAmount) CalculateSalesVatAmounts(IEnumerable<InvoiceItem> items)
    {
        var totalAmount = items.Sum(x => x.LineTotal);
        var taxableAmount = items.Sum(x =>
        {
            var factor = 1 + (x.GstPercentage / 100m);
            return factor <= 0 ? x.LineTotal : x.LineTotal / factor;
        });
        var vatAmount = totalAmount - taxableAmount;

        return (taxableAmount, vatAmount, totalAmount);
    }

    private async Task UpsertSalesVatAsync(Invoice invoice)
    {
        var (taxableAmount, vatAmount, totalAmount) = CalculateSalesVatAmounts(invoice.Items);
        var existing = await _context.SalesVat.FirstOrDefaultAsync(x => x.InvoiceId == invoice.Id);

        if (existing == null)
        {
            _context.SalesVat.Add(new SalesVat
            {
                InvoiceId = invoice.Id,
                InvoiceNumber = invoice.InvoiceNumber,
                Date = invoice.Date,
                CustomerName = invoice.CustomerName,
                TaxableAmount = taxableAmount,
                VatAmount = vatAmount,
                TotalAmount = totalAmount
            });
            return;
        }

        existing.InvoiceNumber = invoice.InvoiceNumber;
        existing.Date = invoice.Date;
        existing.CustomerName = invoice.CustomerName;
        existing.TaxableAmount = taxableAmount;
        existing.VatAmount = vatAmount;
        existing.TotalAmount = totalAmount;
    }

    /* ---------------------------------------------------------
    CREATE INVOICE
 --------------------------------------------------------- */
    public async Task<InvoiceResponse> CreateAsync(CreateInvoiceRequest request)
    {
        // Handle walk-in/cash customers
        Customer? customer = null;
        string customerName = "Walk-in Customer";
        int? customerId = null;

        if (request.CustomerId.HasValue && request.CustomerId.Value > 0)
        {
            customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Id == request.CustomerId.Value)
                ?? throw new InvalidOperationException("Customer not found");

            customerName = customer.Name;
            customerId = customer.Id;
        }

        var invoice = new Invoice
        {
            InvoiceNumber = "TEMP",
            CustomerId = customerId,
            CustomerName = customerName,
            Date = TimeZoneInfo.ConvertTimeFromUtc(
    DateTime.UtcNow,
    TimeZoneInfo.FindSystemTimeZoneById("India Standard Time")),
            Items = new List<InvoiceItem>(),
            TotalAmount = 0,
            PaidAmount = 0,
           // Status = InvoiceStatus.Unpaid,
            Status = request.Status == "Hold" ? InvoiceStatus.Hold : InvoiceStatus.Unpaid,
            SalesmanId = request.SalesmanId,
        };

        foreach (var item in request.Items)
        {
            var product = await _context.Products
                .FirstOrDefaultAsync(p => p.Id == item.ProductId)
                ?? throw new InvalidOperationException(
                    $"Product with ID {item.ProductId} not found");

            // Check if it's a return (negative quantity)
            bool isReturn = item.Quantity < 0;
            int absoluteQuantity = (int)Math.Abs(item.Quantity); // Convert to int

            // For returns: ADD to stock
            // For sales: SUBTRACT from stock
            if (isReturn)
            {
                product.Stock += absoluteQuantity; // Add stock back
            }
            else
            {
                product.Stock = Math.Max(0, product.Stock - absoluteQuantity); // Reduce stock, never negative
            }

            var invoiceItem = new InvoiceItem
            {
                ProductId = product.Id,
                Quantity = item.Quantity, // Store negative value for returns
                HsnCode = product.HsnCode,
                UnitPrice = item.Rate,
                MRP = item.MRP,
                GstPercentage = item.GstPercentage,
                LineTotal = item.Rate * item.Quantity // Will be negative for returns
            };

            invoice.TotalAmount += invoiceItem.LineTotal; // Negative amounts will reduce total
            invoice.Items.Add(invoiceItem);
        }

        var redemptionRequest = request.Redemption;
        if (redemptionRequest != null)
        {
            if (invoice.Status == InvoiceStatus.Hold)
                throw new InvalidOperationException("Loyalty redemption is not allowed for hold invoices");

            if (customer == null)
                throw new InvalidOperationException("Select a customer to redeem loyalty points");

            if (redemptionRequest.Points <= 0)
                throw new InvalidOperationException("Redeem points must be greater than zero");

            if (customer.LoyaltyPoints < redemptionRequest.Points)
                throw new InvalidOperationException("Insufficient loyalty points");

            if (!Enum.TryParse<LoyaltyRedemptionType>(redemptionRequest.Type, true, out var redemptionType))
                throw new InvalidOperationException("Invalid redemption type");

            decimal discountAmount = 0;
            string? giftProductName = null;

            if (redemptionType == LoyaltyRedemptionType.Discount)
            {
                discountAmount = Math.Min(redemptionRequest.Points, Math.Max(0, invoice.TotalAmount));
                invoice.TotalAmount -= discountAmount;
            }
            else
            {
                giftProductName = redemptionRequest.GiftProductName?.Trim();
                if (string.IsNullOrWhiteSpace(giftProductName))
                    throw new InvalidOperationException("Gift product name is required for gift redemption");

                var giftExists = await _context.GiftProducts.AnyAsync(x => x.ProductName == giftProductName && x.IsActive);
                if (!giftExists)
                    throw new InvalidOperationException("Gift product is not available in gift master");
            }

            customer.LoyaltyPoints -= redemptionRequest.Points;

            invoice.LoyaltyRedemptions.Add(new LoyaltyRedemption
            {
                CustomerId = customer.Id,
                CustomerName = customer.Name,
                CustomerCode = customer.CustomerCode,
                Type = redemptionType,
                PointsUsed = redemptionRequest.Points,
                DiscountAmount = discountAmount,
                GiftProductName = giftProductName,
                RedeemedOn = DateTime.UtcNow
            });
        }

        // Ensure total amount is not negative
        //if (invoice.TotalAmount < 0)
        //{
        //    invoice.TotalAmount = 0;
        //  }

        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync();

        // Generate invoice number AFTER ID
        invoice.InvoiceNumber = $"SMT{invoice.Id:D6}";

        await UpsertSalesVatAsync(invoice);
        await _context.SaveChangesAsync();

        // Load products for response
        await _context.Entry(invoice)
            .Collection(i => i.Items)
            .Query()
            .Include(ii => ii.Product)
            .LoadAsync();

        // Load salesman for response if needed
        if (request.SalesmanId.HasValue)
        {
            await _context.Entry(invoice)
                .Reference(i => i.Salesman)
                .LoadAsync();
        }

        return await BuildInvoiceResponseAsync(invoice, paymentMode: null);
    }
    /* ---------------------------------------------------------
   CANCEL INVOICE
--------------------------------------------------------- */
    public async Task<InvoiceResponse> CancelAsync(CancelInvoiceRequest request)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Items)
                .ThenInclude(ii => ii.Product)
            .Include(i => i.Salesman)
            .FirstOrDefaultAsync(i => i.Id == request.InvoiceId)
            ?? throw new InvalidOperationException("Invoice not found");

        if (invoice.Status == InvoiceStatus.Cancelled)
            throw new InvalidOperationException("Invoice already cancelled");

        if (invoice.Status == InvoiceStatus.Paid ||
            invoice.Status == InvoiceStatus.Refunded ||
            invoice.Status == InvoiceStatus.PartiallyRefunded)
        {
            throw new InvalidOperationException(
                "Paid or refunded invoices cannot be cancelled");
        }

        // Restore stock - handle returns correctly
        foreach (var item in invoice.Items)
        {
            // For normal sales (positive quantity): add stock back
            // For returns (negative quantity): reduce stock (reverse the return)
            if (item.Quantity > 0)
            {
                item.Product!.Stock += (int)item.Quantity; // Cast to int
            }
            else
            {
                item.Product!.Stock = Math.Max(0, item.Product!.Stock - (int)Math.Abs(item.Quantity)); // Clamp to zero
            }
        }

        invoice.Status = InvoiceStatus.Cancelled;
        invoice.CancelledOn = DateTime.UtcNow;
        invoice.CancellationReason = request.Reason;

        var salesVat = await _context.SalesVat.FirstOrDefaultAsync(x => x.InvoiceId == invoice.Id);
        if (salesVat != null)
        {
            _context.SalesVat.Remove(salesVat);
        }

        if (invoice.CustomerId.HasValue)
        {
            var redeemedPoints = await _context.LoyaltyRedemptions
                .Where(x => x.InvoiceId == invoice.Id)
                .SumAsync(x => x.PointsUsed);

            if (redeemedPoints > 0)
            {
                var customer = await _context.Customers.FirstOrDefaultAsync(x => x.Id == invoice.CustomerId.Value);
                if (customer != null)
                {
                    customer.LoyaltyPoints += redeemedPoints;
                }
            }
        }

        await _context.SaveChangesAsync();

        var paymentMode = await GetPaymentModeAsync(invoice.Id);

        return await BuildInvoiceResponseAsync(invoice, paymentMode);
    }

    public async Task<InvoiceResponse?> GetByInvoiceNumberAsync(string invoiceNumber)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Items)
                .ThenInclude(ii => ii.Product)
            .Include(i => i.Salesman)
            .FirstOrDefaultAsync(i => i.InvoiceNumber == invoiceNumber);

        if (invoice == null)
            return null;

        var paymentMode = await GetPaymentModeAsync(invoice.Id);

        return await BuildInvoiceResponseAsync(invoice, paymentMode);
    }

    /* ---------------------------------------------------------
       GET ALL INVOICES
    --------------------------------------------------------- */
    public async Task<List<InvoiceResponse>> GetAllAsync()
    {
        var invoices = await _context.Invoices
            .Include(i => i.Items)
                .ThenInclude(ii => ii.Product)
            .Include(i => i.Salesman)
            .ToListAsync();

        var result = new List<InvoiceResponse>();

        foreach (var invoice in invoices)
        {
            var paymentMode = await GetPaymentModeAsync(invoice.Id);
            result.Add(await BuildInvoiceResponseAsync(invoice, paymentMode));
        }

        return result;
    }

    /* ---------------------------------------------------------
   UPDATE INVOICE
--------------------------------------------------------- */
    public async Task<InvoiceResponse> UpdateAsync(int id, UpdateInvoiceRequest request)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Items)
                .ThenInclude(ii => ii.Product)
            .Include(i => i.Salesman)
            .FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new InvalidOperationException("Invoice not found");

        // Check if invoice can be updated
        if (invoice.Status == InvoiceStatus.Cancelled)
            throw new InvalidOperationException("Cannot update a cancelled invoice");

        if (invoice.Status == InvoiceStatus.Paid || invoice.Status == InvoiceStatus.Refunded)
            throw new InvalidOperationException("Cannot update a paid or refunded invoice");

        // Store old items for stock reversal
        var oldItems = invoice.Items.ToList();
        decimal oldTotal = invoice.TotalAmount;

        // Update customer info if provided
        if (request.CustomerId.HasValue)
        {
            if (request.CustomerId.Value > 0)
            {
                var customer = await _context.Customers
                    .FirstOrDefaultAsync(c => c.Id == request.CustomerId.Value)
                    ?? throw new InvalidOperationException("Customer not found");

                invoice.CustomerId = customer.Id;
                invoice.CustomerName = customer.Name;
            }
            else
            {
                invoice.CustomerId = null;
                invoice.CustomerName = "Walk-in Customer";
            }
        }
        else if (!string.IsNullOrEmpty(request.CustomerName))
        {
            invoice.CustomerName = request.CustomerName;
        }

        // Update salesman if provided
        if (request.SalesmanId.HasValue)
        {
            invoice.SalesmanId = request.SalesmanId.Value;
        }

        // Update status if provided
        if (!string.IsNullOrEmpty(request.Status))
        {
            if (Enum.TryParse<InvoiceStatus>(request.Status, true, out var status))
            {
                invoice.Status = status;
            }
        }

        // Update items if provided
        if (request.Items != null && request.Items.Count > 0)
        {
            // 1. Reverse stock changes from old items
            foreach (var oldItem in oldItems)
            {
                var product = await _context.Products.FindAsync(oldItem.ProductId);
                if (product != null)
                {
                    // Reverse the stock change
                    if (oldItem.Quantity > 0)
                    {
                        product.Stock += (int)oldItem.Quantity; // Add back stock
                    }
                    else
                    {
                        product.Stock = Math.Max(0, product.Stock - (int)Math.Abs(oldItem.Quantity)); // Clamp to zero
                    }
                }
            }

            // 2. Clear old items
            _context.InvoiceItems.RemoveRange(invoice.Items);
            invoice.Items.Clear();
            invoice.TotalAmount = 0;

            // 3. Add new items
            foreach (var itemRequest in request.Items)
            {
                var product = await _context.Products
                    .FirstOrDefaultAsync(p => p.Id == itemRequest.ProductId)
                    ?? throw new InvalidOperationException(
                        $"Product with ID {itemRequest.ProductId} not found");

                bool isReturn = itemRequest.Quantity < 0;
                int absoluteQuantity = (int)Math.Abs(itemRequest.Quantity);

                // Apply stock changes for new items
                if (isReturn)
                {
                    product.Stock += absoluteQuantity; // Add stock back for returns
                }
                else
                {
                    product.Stock = Math.Max(0, product.Stock - absoluteQuantity); // Reduce stock, never negative
                }

                var invoiceItem = new InvoiceItem
                {
                    ProductId = product.Id,
                    Quantity = itemRequest.Quantity,
                    HsnCode = product.HsnCode,
                    UnitPrice = itemRequest.Rate,
                    MRP = itemRequest.MRP,
                    GstPercentage = itemRequest.GstPercentage,
                    LineTotal = itemRequest.Rate * itemRequest.Quantity
                };

                invoice.TotalAmount += invoiceItem.LineTotal;
                invoice.Items.Add(invoiceItem);
            }

            // Ensure total amount is not negative
            if (invoice.TotalAmount < 0)
            {
                invoice.TotalAmount = 0;
            }
        }

        // Update paid amount and balance if total changed
        if (invoice.TotalAmount != oldTotal)
        {
            // If the new total is less than paid amount, adjust paid amount
            if (invoice.TotalAmount < invoice.PaidAmount)
            {
                invoice.PaidAmount = invoice.TotalAmount;
            }
           // invoice.Balance = invoice.TotalAmount - invoice.PaidAmount;
        }

        await UpsertSalesVatAsync(invoice);

        await _context.SaveChangesAsync();

        // Load related data for response
        await _context.Entry(invoice)
            .Collection(i => i.Items)
            .Query()
            .Include(ii => ii.Product)
            .LoadAsync();

        if (invoice.SalesmanId.HasValue)
        {
            await _context.Entry(invoice)
                .Reference(i => i.Salesman)
                .LoadAsync();
        }

        var paymentMode = await GetPaymentModeAsync(invoice.Id);

        return await BuildInvoiceResponseAsync(invoice, paymentMode);
    }

    /* ---------------------------------------------------------
       ADMIN UPDATE INVOICE
    --------------------------------------------------------- */
    public async Task<InvoiceResponse> AdminUpdateAsync(int id, UpdateInvoiceRequest request)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Items)
                .ThenInclude(ii => ii.Product)
            .Include(i => i.Salesman)
            .FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new InvalidOperationException("Invoice not found");

        if (invoice.Status == InvoiceStatus.Cancelled)
            throw new InvalidOperationException("Cannot update a cancelled invoice");

        var oldItems = invoice.Items.ToList();
        decimal oldTotal = invoice.TotalAmount;

        if (request.CustomerId.HasValue)
        {
            if (request.CustomerId.Value > 0)
            {
                var customer = await _context.Customers
                    .FirstOrDefaultAsync(c => c.Id == request.CustomerId.Value)
                    ?? throw new InvalidOperationException("Customer not found");

                invoice.CustomerId = customer.Id;
                invoice.CustomerName = customer.Name;
            }
            else
            {
                invoice.CustomerId = null;
                invoice.CustomerName = "Walk-in Customer";
            }
        }
        else if (!string.IsNullOrEmpty(request.CustomerName))
        {
            invoice.CustomerName = request.CustomerName;
        }

        if (request.SalesmanId.HasValue)
        {
            invoice.SalesmanId = request.SalesmanId.Value;
        }

        if (request.Items != null && request.Items.Count > 0)
        {
            foreach (var oldItem in oldItems)
            {
                var product = await _context.Products.FindAsync(oldItem.ProductId);
                if (product != null)
                {
                    if (oldItem.Quantity > 0)
                        product.Stock += (int)oldItem.Quantity;
                    else
                        product.Stock = Math.Max(0, product.Stock - (int)Math.Abs(oldItem.Quantity));
                }
            }

            _context.InvoiceItems.RemoveRange(invoice.Items);
            invoice.Items.Clear();
            invoice.TotalAmount = 0;

            foreach (var itemRequest in request.Items)
            {
                var product = await _context.Products
                    .FirstOrDefaultAsync(p => p.Id == itemRequest.ProductId)
                    ?? throw new InvalidOperationException(
                        $"Product with ID {itemRequest.ProductId} not found");

                bool isReturn = itemRequest.Quantity < 0;
                int absoluteQuantity = (int)Math.Abs(itemRequest.Quantity);

                if (isReturn)
                    product.Stock += absoluteQuantity;
                else
                    product.Stock = Math.Max(0, product.Stock - absoluteQuantity);

                var invoiceItem = new InvoiceItem
                {
                    ProductId = product.Id,
                    Quantity = itemRequest.Quantity,
                    HsnCode = product.HsnCode,
                    UnitPrice = itemRequest.Rate,
                    MRP = itemRequest.MRP,
                    GstPercentage = itemRequest.GstPercentage,
                    LineTotal = itemRequest.Rate * itemRequest.Quantity
                };

                invoice.TotalAmount += invoiceItem.LineTotal;
                invoice.Items.Add(invoiceItem);
            }

            if (invoice.TotalAmount < 0)
            {
                invoice.TotalAmount = 0;
            }
        }

        // Delete all old payments to reset
        var existingPayments = await _context.Payments.Where(p => p.InvoiceId == invoice.Id).ToListAsync();
        _context.Payments.RemoveRange(existingPayments);

        // Reset paid amount and status
        invoice.PaidAmount = 0;
        invoice.Status = InvoiceStatus.Unpaid;

        await UpsertSalesVatAsync(invoice);

        await _context.SaveChangesAsync();

        await _context.Entry(invoice)
            .Collection(i => i.Items)
            .Query()
            .Include(ii => ii.Product)
            .LoadAsync();

        if (invoice.SalesmanId.HasValue)
        {
            await _context.Entry(invoice)
                .Reference(i => i.Salesman)
                .LoadAsync();
        }

        var paymentMode = await GetPaymentModeAsync(invoice.Id);

        return await BuildInvoiceResponseAsync(invoice, paymentMode);
    }

    /* ---------------------------------------------------------
       GET INVOICE BY ID
    --------------------------------------------------------- */
    public async Task<InvoiceResponse?> GetByIdAsync(int invoiceId)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Items)
                .ThenInclude(ii => ii.Product)
            .Include(i => i.Salesman)
            .FirstOrDefaultAsync(i => i.Id == invoiceId);

        if (invoice == null)
            return null;

        var paymentMode = await GetPaymentModeAsync(invoice.Id);

        return await BuildInvoiceResponseAsync(invoice, paymentMode);
    }

    /* ---------------------------------------------------------
       GET RECENT FOR REPRINT
    --------------------------------------------------------- */
    public async Task<List<InvoiceResponse>> GetRecentForReprintAsync(int limit, string searchPrefix = "")
    {
        var query = _context.Invoices
            .Where(i => i.Status != InvoiceStatus.Hold);

        if (!string.IsNullOrWhiteSpace(searchPrefix))
        {
            query = query.Where(i => i.InvoiceNumber.Contains(searchPrefix));
        }

        var invoices = await query
            .OrderByDescending(i => i.Id)
            .Take(limit)
            .Include(i => i.Items)
                .ThenInclude(ii => ii.Product)
            .Include(i => i.Salesman)
            .ToListAsync();

        var result = new List<InvoiceResponse>();

        foreach (var invoice in invoices)
        {
            var paymentMode = await GetPaymentModeAsync(invoice.Id);
            result.Add(await BuildInvoiceResponseAsync(invoice, paymentMode));
        }

        return result;
    }

    /* ---------------------------------------------------------
       GET HOLD / UNPAID INVOICES
    --------------------------------------------------------- */
    public async Task<List<InvoiceResponse>> GetHoldInvoicesAsync()
    {
        var invoices = await _context.Invoices
            .Where(i => i.Status == InvoiceStatus.Hold || i.Status == InvoiceStatus.Unpaid)
            .OrderByDescending(i => i.Id)
            .Include(i => i.Items)
                .ThenInclude(ii => ii.Product)
            .Include(i => i.Salesman)
            .ToListAsync();

        var result = new List<InvoiceResponse>();

        foreach (var invoice in invoices)
        {
            var paymentMode = await GetPaymentModeAsync(invoice.Id);
            result.Add(await BuildInvoiceResponseAsync(invoice, paymentMode));
        }

        return result;
    }

    /* ---------------------------------------------------------
       GET BY CUSTOMER ID
    --------------------------------------------------------- */
    public async Task<List<InvoiceResponse>> GetByCustomerIdAsync(int customerId)
    {
        var invoices = await _context.Invoices
            .Where(i => i.CustomerId == customerId)
            .OrderByDescending(i => i.Id)
            .Include(i => i.Items)
                .ThenInclude(ii => ii.Product)
            .Include(i => i.Salesman)
            .ToListAsync();

        var result = new List<InvoiceResponse>();
        foreach (var invoice in invoices)
        {
            var paymentMode = await GetPaymentModeAsync(invoice.Id);
            result.Add(await BuildInvoiceResponseAsync(invoice, paymentMode));
        }
        return result;
    }

    /* ---------------------------------------------------------
       GET BY SALESMAN ID
    --------------------------------------------------------- */
    public async Task<List<InvoiceResponse>> GetBySalesmanIdAsync(int salesmanId)
    {
        var invoices = await _context.Invoices
            .Where(i => i.SalesmanId == salesmanId)
            .OrderByDescending(i => i.Id)
            .Include(i => i.Items)
                .ThenInclude(ii => ii.Product)
            .Include(i => i.Salesman)
            .ToListAsync();

        var result = new List<InvoiceResponse>();
        foreach (var invoice in invoices)
        {
            var paymentMode = await GetPaymentModeAsync(invoice.Id);
            result.Add(await BuildInvoiceResponseAsync(invoice, paymentMode));
        }
        return result;
    }

    /* ---------------------------------------------------------
       GET TODAY'S INVOICES
    --------------------------------------------------------- */
    public async Task<List<InvoiceResponse>> GetTodayInvoicesAsync()
    {
        var today = DateTime.UtcNow.Date;
        var invoices = await _context.Invoices
            .Where(i => i.Date.Date == today)
            .OrderByDescending(i => i.Id)
            .Include(i => i.Items)
                .ThenInclude(ii => ii.Product)
            .Include(i => i.Salesman)
            .ToListAsync();

        var result = new List<InvoiceResponse>();
        foreach (var invoice in invoices)
        {
            var paymentMode = await GetPaymentModeAsync(invoice.Id);
            result.Add(await BuildInvoiceResponseAsync(invoice, paymentMode));
        }
        return result;
    }

    /* ---------------------------------------------------------
       GET BY DATE RANGE
    --------------------------------------------------------- */
    public async Task<List<InvoiceResponse>> GetByDateRangeAsync(DateTime fromDate, DateTime toDate)
    {
        var from = fromDate.Date;
        var to = toDate.Date;
        var invoices = await _context.Invoices
            .Where(i => i.Date.Date >= from && i.Date.Date <= to)
            .OrderByDescending(i => i.Id)
            .Include(i => i.Items)
                .ThenInclude(ii => ii.Product)
            .Include(i => i.Salesman)
            .ToListAsync();

        var result = new List<InvoiceResponse>();
        foreach (var invoice in invoices)
        {
            var paymentMode = await GetPaymentModeAsync(invoice.Id);
            result.Add(await BuildInvoiceResponseAsync(invoice, paymentMode));
        }
        return result;
    }

    /* ---------------------------------------------------------
       GET INVOICE SUMMARY
    --------------------------------------------------------- */
    public async Task<object> GetInvoiceSummaryAsync()
    {
        var today = DateTime.UtcNow.Date;

        var totalInvoices = await _context.Invoices.CountAsync();
        var totalAmount = await _context.Invoices.SumAsync(i => (decimal?)i.TotalAmount) ?? 0m;
        var totalPaid = await _context.Invoices.SumAsync(i => (decimal?)i.PaidAmount) ?? 0m;
        var totalBalance = totalAmount - totalPaid;

        var todayCount = await _context.Invoices.CountAsync(i => i.Date.Date == today);
        var unpaidCount = await _context.Invoices.CountAsync(i => i.Status == InvoiceStatus.Unpaid && (i.TotalAmount - i.PaidAmount) > 0);
        var paidCount = await _context.Invoices.CountAsync(i => i.Status == InvoiceStatus.Paid);
        var cancelledCount = await _context.Invoices.CountAsync(i => i.Status == InvoiceStatus.Cancelled);

        return new
        {
            TotalInvoices = totalInvoices,
            TotalAmount = totalAmount,
            TotalPaid = totalPaid,
            TotalBalance = totalBalance,
            TodayCount = todayCount,
            UnpaidCount = unpaidCount,
            PaidCount = paidCount,
            CancelledCount = cancelledCount
        };
    }
}