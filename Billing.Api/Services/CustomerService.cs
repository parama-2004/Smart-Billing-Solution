using Billing.Api.Data;
using Billing.Api.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Billing.Api.Services;

public class CustomerService : ICustomerService
{
    private readonly BillingDbContext _context;
    private static readonly Random _random = new();

    public CustomerService(BillingDbContext context)
    {
        _context = context;
    }

    // -------------------------------
    // Customer Ledger Summary
    // -------------------------------
    public async Task<CustomerLedgerSummaryResponse> GetLedgerSummaryAsync(int customerId)
    {
        string Code = customerId.ToString();
        var customer = await _context.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.CustomerCode == Code)
            ?? throw new InvalidOperationException("Customer not found");

        // Total cash received from customer
        var paidAmount = await _context.Invoices
            .Where(i => i.CustomerId == customerId)
            .SumAsync(i => i.PaidAmount);

        return new CustomerLedgerSummaryResponse(
            customer.Id,
            customer.CustomerCode,
            customer.Name,
            customer.Mobile,
            customer.Address,
            customer.Telephone,
            customer.Email,

            customer.DateOfJoin,
            customer.ExpiryDate,
            customer.OpeningBalance,
            customer.PurchaseAmount,
            paidAmount,
            customer.ReturnedAmount,
            customer.ClosingBalance,
            customer.LoyaltyPoints
        );
    }

    public async Task<CustomerLedgerSummaryResponse> GetLedgerCCAsync(int customerId)
    {
        //string Code = customerId.ToString();
        var customer = await _context.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == customerId)
            ?? throw new InvalidOperationException("Customer not found");

        // Total cash received from customer
        var paidAmount = await _context.Invoices
            .Where(i => i.CustomerId == customerId)
            .SumAsync(i => i.PaidAmount);

        return new CustomerLedgerSummaryResponse(
            customer.Id,
            customer.CustomerCode,
            customer.Name,
            customer.Mobile,
            customer.Address,
            customer.Telephone,
            customer.Email,

            customer.DateOfJoin,
            customer.ExpiryDate,
            customer.OpeningBalance,
            customer.PurchaseAmount,
            paidAmount,
            customer.ReturnedAmount,
            customer.ClosingBalance,
            customer.LoyaltyPoints
        );
    }

    // -------------------------------
    // Get All Customers
    // -------------------------------
    public async Task<List<CustomerResponse>> GetAllAsync()
    {
        return await _context.Customers
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CustomerResponse(
                c.Id,
                c.CustomerCode,
                c.Name,
                c.Mobile,
                c.Address,
                c.Telephone,
                c.Email,
                c.OpeningBalance,
                c.ClosingBalance,
                c.PurchaseAmount,
                c.ReturnedAmount,
                c.LoyaltyPoints

            ))
            .ToListAsync();
    }

    // -------------------------------
    // Customer Statement
    // -------------------------------
    public async Task<CustomerStatementResponse> GetStatementAsync(
    int customerId,
    DateTime fromDate,
    DateTime toDate)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == customerId)
            ?? throw new InvalidOperationException("Customer not found");

        // Normalize dates
        fromDate = fromDate.Date;
        toDate = toDate.Date.AddDays(1).AddTicks(-1);

        // Opening balance = balance before fromDate
        var openingBalance =
            customer.OpeningBalance +
            await _context.Invoices
                .Where(i => i.CustomerId == customerId && i.Date < fromDate)
                .SumAsync(i => i.TotalAmount)
            -
            await _context.Payments
                .Where(p => p.Invoice.CustomerId == customerId && p.PaidOn < fromDate)
                .SumAsync(p => p.Amount)
            -
            await _context.Refunds
                .Where(r => r.Invoice.CustomerId == customerId && r.RefundedOn < fromDate)
                .SumAsync(r => r.Amount);

        var entries = new List<CustomerStatementEntry>();
        decimal runningBalance = openingBalance;

        // Invoices
        var invoices = await _context.Invoices
            .Where(i => i.CustomerId == customerId &&
                        i.Date >= fromDate &&
                        i.Date <= toDate)
            .ToListAsync();

        foreach (var invoice in invoices)
        {
            runningBalance += invoice.TotalAmount;
            entries.Add(new CustomerStatementEntry(
                invoice.Date,
                invoice.InvoiceNumber,
                "Invoice",
                invoice.TotalAmount,
                0,
                runningBalance
            ));
        }

        // Payments
        var payments = await _context.Payments
            .Include(p => p.Invoice)
            .Where(p => p.Invoice.CustomerId == customerId &&
                        p.PaidOn >= fromDate &&
                        p.PaidOn <= toDate)
            .ToListAsync();

        foreach (var payment in payments)
        {
            runningBalance -= payment.Amount;
            entries.Add(new CustomerStatementEntry(
                payment.PaidOn,
                $"PAY-{payment.Id}",
                "Payment",
                0,
                payment.Amount,
                runningBalance
            ));
        }

        // Refunds
        var refunds = await _context.Refunds
            .Include(r => r.Invoice)
            .Where(r => r.Invoice.CustomerId == customerId &&
                        r.RefundedOn >= fromDate &&
                        r.RefundedOn <= toDate)
            .ToListAsync();

        foreach (var refund in refunds)
        {
            runningBalance -= refund.Amount;
            entries.Add(new CustomerStatementEntry(
                refund.RefundedOn,
                $"REF-{refund.Id}",
                "Refund",
                0,
                refund.Amount,
                runningBalance
            ));
        }

        // Sort by date
        entries = entries.OrderBy(e => e.Date).ToList();

        return new CustomerStatementResponse(
            customer.Id,
            customer.CustomerCode,
            customer.Name,
            fromDate,
            toDate,
            openingBalance,
            runningBalance,
            entries
        );
    }
    public async Task<CustomerResponse> UpdateAsync(int id, UpdateCustomerRequest r)
    {
        var c = await _context.Customers.FindAsync(id)
            ?? throw new InvalidOperationException("Customer not found");

        c.Name = r.Name;
        c.Mobile = r.Mobile;
        c.Address = r.Address;
        c.Telephone = r.Telephone;
        c.Email = r.Email;

        await _context.SaveChangesAsync();

        return new CustomerResponse(
            c.Id, c.CustomerCode, c.Name, c.Mobile, c.Address,
            c.Telephone, c.Email,
            c.OpeningBalance, c.ClosingBalance,
            c.PurchaseAmount, c.ReturnedAmount, c.LoyaltyPoints
        );
    }


    // -------------------------------
    // Create New Customer
    // -------------------------------
    public async Task<CustomerResponse> CreateAsync(CreateCustomerRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new InvalidOperationException("Customer name is required");

        if (string.IsNullOrWhiteSpace(request.Mobile))
            throw new InvalidOperationException("Mobile number is required");

        if (string.IsNullOrWhiteSpace(request.Address))
            throw new InvalidOperationException("Address is required");

        var customer = new Customer
        {
            // Temporary placeholder - will be updated after SaveChangesAsync
            CustomerCode = "TEMP",
            Name = request.Name,
            Mobile = request.Mobile,
            Address = request.Address,
            Telephone = request.Telephone,
            Email = request.Email,
            OpeningBalance = request.OpeningBalance,
            ClosingBalance = request.OpeningBalance,
            PurchaseAmount = 0,
            ReturnedAmount = 0,
            LoyaltyPoints = 0,
            DateOfJoin = DateTime.UtcNow
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        // Generate the 4-digit code after we have the ID
        customer.CustomerCode = $"{1000 + customer.Id:D4}";
        await _context.SaveChangesAsync();

        return new CustomerResponse(
            customer.Id,
            customer.CustomerCode,
            customer.Name,
            customer.Mobile,
            customer.Address,
            customer.Telephone,
            customer.Email,
            customer.OpeningBalance,
            customer.ClosingBalance,
            customer.PurchaseAmount,
            customer.ReturnedAmount,
            customer.LoyaltyPoints
        );
    }
}