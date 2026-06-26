using Billing.Api.Data;
using Billing.Api.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Billing.Api.Services;

public class PurchaseService : IPurchaseService
{
    private readonly BillingDbContext _context;

    public PurchaseService(BillingDbContext context)
    {
        _context = context;
    }

    private async Task UpsertPurchaseVatAsync(PurchaseEntry purchase)
    {
        var existing = await _context.PurchaseVat.FirstOrDefaultAsync(x => x.PurchaseId == purchase.Id);
        var taxableAmount = purchase.TotalAmount - purchase.GstTotal;

        if (existing == null)
        {
            _context.PurchaseVat.Add(new PurchaseVat
            {
                PurchaseId = purchase.Id,
                InvoiceNo = purchase.InvoiceNo,
                Date = purchase.Date,
                DistributorName = purchase.DistributorName,
                TaxableAmount = taxableAmount,
                VatAmount = purchase.GstTotal,
                TotalAmount = purchase.TotalAmount
            });
            return;
        }

        existing.InvoiceNo = purchase.InvoiceNo;
        existing.Date = purchase.Date;
        existing.DistributorName = purchase.DistributorName;
        existing.TaxableAmount = taxableAmount;
        existing.VatAmount = purchase.GstTotal;
        existing.TotalAmount = purchase.TotalAmount;
    }

    public async Task<PurchaseResponse> CreatePurchaseAsync(CreatePurchaseRequest request)
    {
        // Check if invoice number already exists
        if (await _context.PurchaseEntry.AnyAsync(p => p.InvoiceNo == request.InvoiceNo))
            throw new InvalidOperationException($"Invoice number '{request.InvoiceNo}' already exists");

        // Find distributor by ID
        var distributor = await _context.Distributors
            .FirstOrDefaultAsync(d => d.Id == request.DistributorId);

        if (distributor == null)
            throw new InvalidOperationException($"Distributor with ID '{request.DistributorId}' not found");

        // Calculate totals from items
        decimal subTotal = 0;
        decimal gstTotal = 0;
        decimal totalItemDiscount = 0;

        var purchase = new PurchaseEntry
        {
            Date = request.Date.ToUniversalTime(),
            DistributorId = request.DistributorId,
            DistributorName = request.DistributorName,
            InvoiceNo = request.InvoiceNo,
            InvoiceDate = request.InvoiceDate.ToUniversalTime(),
            Type = request.Type,
            Status = PaymentStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        // Add items and calculate totals
        foreach (var itemReq in request.Items)
        {
            // Calculate taxable value before discount
            decimal taxableValueBeforeDiscount = itemReq.UnitPrice * itemReq.Quantity;

            // Calculate discount amount for this item
            decimal itemDiscountAmount = itemReq.DiscountValue > 0 ?
                (itemReq.DiscountType == "percentage" ?
                    (taxableValueBeforeDiscount * itemReq.DiscountValue) / 100 :
                    itemReq.DiscountValue) :
                0;

            // Ensure discount doesn't exceed taxable value
            itemDiscountAmount = Math.Min(itemDiscountAmount, taxableValueBeforeDiscount);

            // Taxable value after discount (GST-exclusive base)
            decimal taxableValue = taxableValueBeforeDiscount - itemDiscountAmount;

            // GST amount from GST-exclusive base value
            decimal gstAmount = (taxableValue * itemReq.GstPercentage) / 100;

            // Line total includes base + GST
            decimal lineTotal = taxableValue + gstAmount;

            var item = new PurchaseItem
            {
                ProductId = itemReq.ProductId,
                ProductName = itemReq.ProductName,
                HsnCode = itemReq.HsnCode,
                BrandCode = itemReq.BrandCode,
                CategoryCode = itemReq.CategoryCode,
                Quantity = itemReq.Quantity,
                UnitPrice = itemReq.UnitPrice,
                PurchaseRate = itemReq.PurchaseRate,
                Mrp = itemReq.Mrp,
                GstPercentage = itemReq.GstPercentage,
                DiscountType = itemReq.DiscountType,
                DiscountValue = itemReq.DiscountValue,
                DiscountAmount = itemDiscountAmount,
                GstAmount = gstAmount,
                LineTotal = lineTotal
            };

            subTotal += taxableValue; // GST-exclusive subtotal
            gstTotal += gstAmount; // GST amount
            totalItemDiscount += itemDiscountAmount;
            purchase.Items.Add(item);

            // Update product stock
            var product = await _context.Products.FindAsync(itemReq.ProductId);
            if (product != null)
            {
                product.Stock += itemReq.Quantity;
                product.CostPrice = itemReq.PurchaseRate;
            }
        }

        // Set purchase totals
        purchase.SubTotal = subTotal;
        purchase.GstTotal = gstTotal;

        purchase.Discount = request.Discount;
        purchase.OtherCharges = request.OtherCharges;
        purchase.RoundOff = request.RoundOff;
        // Apply overall adjustments
        decimal baseTotal = subTotal + gstTotal; // GST-inclusive total before adjustments
        decimal totalBeforeRoundOff = baseTotal - request.Discount + request.OtherCharges;
        decimal grandTotal = totalBeforeRoundOff + request.RoundOff;

        purchase.TotalAmount = grandTotal;
        purchase.PaidAmount = 0;
        purchase.BalanceAmount = grandTotal;

        // Update distributor ledger
        distributor.PurchaseAmount += purchase.TotalAmount;

        _context.PurchaseEntry.Add(purchase);
        await _context.SaveChangesAsync();

        await UpsertPurchaseVatAsync(purchase);
        await _context.SaveChangesAsync();

        return await GetPurchaseByIdAsync(purchase.Id);
    }

    public async Task<PurchaseResponse?> GetPurchaseByIdAsync(int id)
    {
        var purchase = await _context.PurchaseEntry
            .Include(p => p.Items)
            .Include(p => p.Payments)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (purchase == null)
            return null;

        return new PurchaseResponse
        {
            Id = purchase.Id,
            Date = purchase.Date,
            DistributorId = purchase.DistributorId,
            DistributorName = purchase.DistributorName,
            InvoiceNo = purchase.InvoiceNo,
            InvoiceDate = purchase.InvoiceDate,
            Type = purchase.Type,
            SubTotal = purchase.SubTotal,
            GstTotal = purchase.GstTotal,
            TotalAmount = purchase.TotalAmount,
            PaidAmount = purchase.PaidAmount,
            BalanceAmount = purchase.BalanceAmount,
            Status = purchase.Status,
            Discount = purchase.Discount,
            OtherCharges = purchase.OtherCharges,
            RoundOff = purchase.RoundOff,
            Items = purchase.Items.Select(i => new PurchaseItemResponse
            {
                ProductId = i.ProductId,
                ProductName = i.ProductName,
                HsnCode = i.HsnCode,
                BrandCode = i.BrandCode,
                CategoryCode = i.CategoryCode,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                PurchaseRate = i.PurchaseRate,
                Mrp = i.Mrp,
                GstPercentage = i.GstPercentage,
                GstAmount = i.GstAmount,
                LineTotal = i.LineTotal,
                DiscountType = i.DiscountType,
                DiscountValue = i.DiscountValue,
                DiscountAmount = i.DiscountAmount
            }).ToList(),
            Payments = purchase.Payments.Select(p => new PurchasePaymentResponse
            {
                Id = p.Id,
                Mode = p.Mode,
                ChequeNo = p.ChequeNo,
                ChequeDate = p.ChequeDate,
                BankName = p.BankName,
                PaymentDate = p.PaymentDate,
                Amount = p.Amount,
                Remarks = p.Remarks,
                Status = p.Status
            }).ToList()
        };
    }

    public async Task<List<PurchaseResponse>> GetAllPurchasesAsync()
    {
        var purchases = await _context.PurchaseEntry
            .Include(p => p.Items)
            .Include(p => p.Payments)
            .OrderByDescending(p => p.Date)
            .ToListAsync();

        return purchases.Select(p => new PurchaseResponse
        {
            Id = p.Id,
            Date = p.Date,
            DistributorId = p.DistributorId,
            DistributorName = p.DistributorName,
            InvoiceNo = p.InvoiceNo,
            InvoiceDate = p.InvoiceDate,
            Type = p.Type,
            SubTotal = p.SubTotal,
            GstTotal = p.GstTotal,
            TotalAmount = p.TotalAmount,
            PaidAmount = p.PaidAmount,
            BalanceAmount = p.BalanceAmount,
            Status = p.Status,
            Discount = p.Discount,
            OtherCharges = p.OtherCharges,
            RoundOff = p.RoundOff,
            Items = p.Items.Select(i => new PurchaseItemResponse
            {
                ProductId = i.ProductId,
                ProductName = i.ProductName,
                HsnCode = i.HsnCode,
                BrandCode = i.BrandCode,
                CategoryCode = i.CategoryCode,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                PurchaseRate = i.PurchaseRate,
                Mrp = i.Mrp,
                GstPercentage = i.GstPercentage,
                GstAmount = i.GstAmount,
                LineTotal = i.LineTotal,
                DiscountType = i.DiscountType,
                DiscountValue = i.DiscountValue,
                DiscountAmount = i.DiscountAmount
            }).ToList(),
            Payments = p.Payments.Select(pay => new PurchasePaymentResponse
            {
                Id = pay.Id,
                Mode = pay.Mode,
                ChequeNo = pay.ChequeNo,
                ChequeDate = pay.ChequeDate,
                BankName = pay.BankName,
                PaymentDate = pay.PaymentDate,
                Amount = pay.Amount,
                Remarks = pay.Remarks,
                Status = pay.Status
            }).ToList()
        }).ToList();
    }

    public async Task<PurchaseResponse> UpdatePurchaseAsync(int id, UpdatePurchaseRequest request)
    {
        var purchase = await _context.PurchaseEntry
            .Include(p => p.Items)
            .Include(p => p.Payments)
            .FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new InvalidOperationException("Purchase not found");

        // Check if invoice number is being changed and if it already exists
        if (purchase.InvoiceNo != request.InvoiceNo &&
            await _context.PurchaseEntry.AnyAsync(p => p.InvoiceNo == request.InvoiceNo && p.Id != id))
            throw new InvalidOperationException($"Invoice number '{request.InvoiceNo}' already exists");

        if (purchase.Status == PaymentStatus.Paid || purchase.Status == PaymentStatus.Cancelled)
            throw new InvalidOperationException($"Cannot update {purchase.Status} purchase");

        // Find distributor by ID
        var distributor = await _context.Distributors
            .FirstOrDefaultAsync(d => d.Id == request.DistributorId);

        if (distributor == null)
            throw new InvalidOperationException($"Distributor with ID '{request.DistributorId}' not found");

        // Store old values for adjustments
        var oldItems = purchase.Items.ToList();
        var oldTotalAmount = purchase.TotalAmount;

        // Restore product stock from old items
        foreach (var oldItem in oldItems)
        {
            var product = await _context.Products.FindAsync(oldItem.ProductId);
            if (product != null)
            {
                product.Stock -= oldItem.Quantity;
            }
        }

        // Clear existing items
        purchase.Items.Clear();

        // Calculate new totals
        decimal subTotal = 0;
        decimal gstTotal = 0;

        // Add updated items
        foreach (var itemReq in request.Items)
        {
            // Calculate taxable value before discount
            decimal taxableValueBeforeDiscount = itemReq.UnitPrice * itemReq.Quantity;

            // Calculate discount amount for this item
            decimal itemDiscountAmount = itemReq.DiscountValue > 0 ?
                (itemReq.DiscountType == "percentage" ?
                    (taxableValueBeforeDiscount * itemReq.DiscountValue) / 100 :
                    itemReq.DiscountValue) :
                0;

            // Ensure discount doesn't exceed taxable value
            itemDiscountAmount = Math.Min(itemDiscountAmount, taxableValueBeforeDiscount);

            // Taxable value after discount (GST-exclusive base)
            decimal taxableValue = taxableValueBeforeDiscount - itemDiscountAmount;

            // Calculate GST amount from GST-exclusive value
            decimal gstAmount = (taxableValue * itemReq.GstPercentage) / 100;

            // Line total includes base + GST
            decimal lineTotal = taxableValue + gstAmount;

            var item = new PurchaseItem
            {
                ProductId = itemReq.ProductId,
                ProductName = itemReq.ProductName,
                HsnCode = itemReq.HsnCode,
                BrandCode = itemReq.BrandCode,
                CategoryCode = itemReq.CategoryCode,
                Quantity = itemReq.Quantity,
                UnitPrice = itemReq.UnitPrice,
                PurchaseRate = itemReq.PurchaseRate,
                Mrp = itemReq.Mrp,
                GstPercentage = itemReq.GstPercentage,
                DiscountType = itemReq.DiscountType,
                DiscountValue = itemReq.DiscountValue,
                DiscountAmount = itemDiscountAmount,
                GstAmount = gstAmount,
                LineTotal = lineTotal,
                PurchaseId = purchase.Id
            };

            subTotal += taxableValue;
            gstTotal += gstAmount;
            purchase.Items.Add(item);

            // Update product stock with new quantities
            var product = await _context.Products.FindAsync(itemReq.ProductId);
            if (product != null)
            {
                product.Stock += itemReq.Quantity;
                product.CostPrice = itemReq.PurchaseRate;
            }
        }

        // Update purchase details
        purchase.Date = request.Date.ToUniversalTime();
        purchase.DistributorId = request.DistributorId;
        purchase.DistributorName = request.DistributorName;
        purchase.InvoiceNo = request.InvoiceNo;
        purchase.InvoiceDate = request.InvoiceDate.ToUniversalTime();
        purchase.Type = request.Type;
        purchase.SubTotal = subTotal;
        purchase.GstTotal = gstTotal;

        purchase.Discount = request.Discount;
        purchase.OtherCharges = request.OtherCharges;
        purchase.RoundOff = request.RoundOff;
        // Apply overall adjustments
        decimal baseTotal = subTotal + gstTotal; // GST-inclusive total
        decimal totalBeforeRoundOff = baseTotal - request.Discount + request.OtherCharges;
        decimal grandTotal = totalBeforeRoundOff + request.RoundOff;

        purchase.TotalAmount = grandTotal;
        purchase.BalanceAmount = purchase.TotalAmount - purchase.PaidAmount;
        purchase.UpdatedAt = DateTime.UtcNow;

        // Update purchase status
        if (purchase.BalanceAmount <= 0)
            purchase.Status = PaymentStatus.Paid;
        else if (purchase.PaidAmount > 0)
            purchase.Status = PaymentStatus.Partial;
        else
            purchase.Status = PaymentStatus.Pending;

        // Update distributor ledger
        var amountDifference = purchase.TotalAmount - oldTotalAmount;
        distributor.PurchaseAmount += amountDifference;

        await UpsertPurchaseVatAsync(purchase);

        await _context.SaveChangesAsync();
        return await GetPurchaseByIdAsync(purchase.Id);
    }

    public async Task<List<PurchaseResponse>> GetPurchasesByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        return await _context.PurchaseEntry
            .Include(p => p.Items)
            .Include(p => p.Payments)
            .Where(p => p.Date >= startDate.ToUniversalTime() && p.Date <= endDate.ToUniversalTime())
            .OrderByDescending(p => p.Date)
            .Select(p => new PurchaseResponse
            {
                Id = p.Id,
                Date = p.Date,
                DistributorId = p.DistributorId,
                DistributorName = p.DistributorName,
                InvoiceNo = p.InvoiceNo,
                InvoiceDate = p.InvoiceDate,
                Type = p.Type,
                SubTotal = p.SubTotal,
                GstTotal = p.GstTotal,
                TotalAmount = p.TotalAmount,
                PaidAmount = p.PaidAmount,
                BalanceAmount = p.BalanceAmount,
                Status = p.Status,
                Discount = p.Discount,
                OtherCharges = p.OtherCharges,
                RoundOff = p.RoundOff,
                Items = p.Items.Select(i => new PurchaseItemResponse
                {
                    ProductId = i.ProductId,
                    ProductName = i.ProductName,
                    HsnCode = i.HsnCode,
                    BrandCode = i.BrandCode,
                    CategoryCode = i.CategoryCode,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    PurchaseRate = i.PurchaseRate,
                    Mrp = i.Mrp,
                    GstPercentage = i.GstPercentage,
                    GstAmount = i.GstAmount,
                    LineTotal = i.LineTotal,
                    DiscountType = i.DiscountType,
                    DiscountValue = i.DiscountValue,
                    DiscountAmount = i.DiscountAmount
                }).ToList(),
                Payments = p.Payments.Select(pay => new PurchasePaymentResponse
                {
                    Id = pay.Id,
                    Mode = pay.Mode,
                    ChequeNo = pay.ChequeNo,
                    ChequeDate = pay.ChequeDate,
                    BankName = pay.BankName,
                    PaymentDate = pay.PaymentDate,
                    Amount = pay.Amount,
                    Remarks = pay.Remarks,
                    Status = pay.Status
                }).ToList()
            })
            .ToListAsync();
    }

    public async Task<List<PurchaseResponse>> GetPurchasesByDistributorAsync(int distributorId)
    {
        return await _context.PurchaseEntry
            .Include(p => p.Items)
            .Include(p => p.Payments)
            .Where(p => p.DistributorId == distributorId)
            .OrderByDescending(p => p.Date)
            .Select(p => new PurchaseResponse
            {
                Id = p.Id,
                Date = p.Date,
                DistributorId = p.DistributorId,
                DistributorName = p.DistributorName,
                InvoiceNo = p.InvoiceNo,
                InvoiceDate = p.InvoiceDate,
                Type = p.Type,
                SubTotal = p.SubTotal,
                GstTotal = p.GstTotal,
                TotalAmount = p.TotalAmount,
                PaidAmount = p.PaidAmount,
                BalanceAmount = p.BalanceAmount,
                Status = p.Status,
                Items = p.Items.Select(i => new PurchaseItemResponse
                {
                    ProductId = i.ProductId,
                    ProductName = i.ProductName,
                    HsnCode = i.HsnCode,
                    BrandCode = i.BrandCode,
                    CategoryCode = i.CategoryCode,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    PurchaseRate = i.PurchaseRate,
                    Mrp = i.Mrp,
                    GstPercentage = i.GstPercentage,
                    GstAmount = i.GstAmount,
                    LineTotal = i.LineTotal,
                    DiscountType = i.DiscountType,
                    DiscountValue = i.DiscountValue,
                    DiscountAmount = i.DiscountAmount
                }).ToList(),
                Payments = p.Payments.Select(pay => new PurchasePaymentResponse
                {
                    Id = pay.Id,
                    Mode = pay.Mode,
                    ChequeNo = pay.ChequeNo,
                    ChequeDate = pay.ChequeDate,
                    BankName = pay.BankName,
                    PaymentDate = pay.PaymentDate,
                    Amount = pay.Amount,
                    Remarks = pay.Remarks,
                    Status = pay.Status
                }).ToList()
            })
            .ToListAsync();
    }

    public async Task<PurchaseResponse> AddPaymentAsync(int purchaseId, CreatePurchasePaymentRequest request)
    {
        var purchase = await _context.PurchaseEntry
            .Include(p => p.Payments)
            .FirstOrDefaultAsync(p => p.Id == purchaseId)
            ?? throw new InvalidOperationException("Purchase not found");

        if (purchase.Status == PaymentStatus.Paid)
            throw new InvalidOperationException("Purchase is already fully paid");

        if (purchase.Status == PaymentStatus.Cancelled)
            throw new InvalidOperationException("Cannot add payment to cancelled purchase");

        var payment = new PurchasePayment
        {
            PurchaseId = purchaseId,
            Mode = request.Mode,
            ChequeNo = request.ChequeNo,
            ChequeDate = request.ChequeDate,
            BankName = request.BankName,
            PaymentDate = request.PaymentDate.ToUniversalTime(),
            Amount = request.Amount,
            Remarks = request.Remarks,
            Status = PaymentStatus.Paid,
            CreatedAt = DateTime.UtcNow
        };

        // Validate cheque for cheque/DD payments
        if ((request.Mode == PaymentMode.Cheque || request.Mode == PaymentMode.DD) &&
            string.IsNullOrWhiteSpace(request.ChequeNo))
        {
            throw new InvalidOperationException("Cheque/DD number is required");
        }

        // Update purchase amounts
        purchase.PaidAmount += request.Amount;
        purchase.BalanceAmount = purchase.TotalAmount - purchase.PaidAmount;
        purchase.UpdatedAt = DateTime.UtcNow;

        // Update purchase status
        if (purchase.BalanceAmount <= 0)
            purchase.Status = PaymentStatus.Paid;
        else if (purchase.PaidAmount > 0)
            purchase.Status = PaymentStatus.Partial;

        // Update distributor ledger
        var distributor = await _context.Distributors
            .FirstOrDefaultAsync(d => d.Id == purchase.DistributorId);

        if (distributor != null)
        {
            distributor.PaidAmount += request.Amount;
        }

        _context.PurchasePayments.Add(payment);
        await _context.SaveChangesAsync();

        return await GetPurchaseByIdAsync(purchaseId);
    }

    public async Task<bool> DeletePaymentAsync(int paymentId)
    {
        var payment = await _context.PurchasePayments
            .Include(p => p.Purchase)
            .FirstOrDefaultAsync(p => p.Id == paymentId);

        if (payment == null)
            return false;

        if (payment.Status == PaymentStatus.Paid)
            throw new InvalidOperationException("Cannot delete completed payment");

        // Update purchase amounts
        payment.Purchase.PaidAmount -= payment.Amount;
        payment.Purchase.BalanceAmount += payment.Amount;
        payment.Purchase.UpdatedAt = DateTime.UtcNow;

        // Update purchase status
        if (payment.Purchase.PaidAmount <= 0)
            payment.Purchase.Status = PaymentStatus.Pending;
        else if (payment.Purchase.PaidAmount < payment.Purchase.TotalAmount)
            payment.Purchase.Status = PaymentStatus.Partial;

        // Update distributor ledger
        var distributor = await _context.Distributors
            .FirstOrDefaultAsync(d => d.Id == payment.Purchase.DistributorId);

        if (distributor != null)
        {
            distributor.PaidAmount -= payment.Amount;
        }

        _context.PurchasePayments.Remove(payment);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> CancelPurchaseAsync(int purchaseId)
    {
        var purchase = await _context.PurchaseEntry
            .Include(p => p.Items)
            .Include(p => p.Payments)
            .FirstOrDefaultAsync(p => p.Id == purchaseId);

        if (purchase == null)
            return false;

        if (purchase.Status == PaymentStatus.Paid)
            throw new InvalidOperationException("Cannot cancel fully paid purchase");

        // Restore product stock
        foreach (var item in purchase.Items)
        {
            var product = await _context.Products.FindAsync(item.ProductId);
            if (product != null)
            {
                product.Stock -= item.Quantity;
            }
        }

        // Update distributor ledger
        var distributor = await _context.Distributors
            .FirstOrDefaultAsync(d => d.Id == purchase.DistributorId);

        if (distributor != null)
        {
            distributor.PurchaseAmount -= purchase.TotalAmount;
            distributor.PaidAmount -= purchase.PaidAmount;
        }

        purchase.Status = PaymentStatus.Cancelled;
        purchase.UpdatedAt = DateTime.UtcNow;

        // Cancel all payments
        foreach (var payment in purchase.Payments.Where(p => p.Status != PaymentStatus.Cancelled))
        {
            payment.Status = PaymentStatus.Cancelled;
            payment.UpdatedAt = DateTime.UtcNow;
        }

        var purchaseVat = await _context.PurchaseVat.FirstOrDefaultAsync(x => x.PurchaseId == purchase.Id);
        if (purchaseVat != null)
        {
            _context.PurchaseVat.Remove(purchaseVat);
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<decimal> GetTotalOutstandingAsync()
    {
        return await _context.PurchaseEntry
            .Where(p => p.Status != PaymentStatus.Paid && p.Status != PaymentStatus.Cancelled)
            .SumAsync(p => p.BalanceAmount);
    }

    public async Task<DailySummaryResponse> GetTodaySummaryAsync()
    {
        var today = DateTime.UtcNow.Date;

        var purchases = await _context.PurchaseEntry
            .Where(p => p.Date.Date == today)
            .ToListAsync();

        var totalPurchases = purchases.Count;
        var totalAmount = purchases.Sum(p => p.TotalAmount);
        var totalPaid = purchases.Sum(p => p.PaidAmount);
        var totalBalance = purchases.Sum(p => p.BalanceAmount);

        return new DailySummaryResponse
        {
            TotalPurchases = totalPurchases,
            TotalAmount = totalAmount,
            TotalPaid = totalPaid,
            TotalBalance = totalBalance
        };
    }
}

