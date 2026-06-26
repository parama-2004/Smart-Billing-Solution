using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Billing.Api.Data;
using Billing.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Billing.Api.Services;

public class DistributorService : IDistributorService
{
    private readonly BillingDbContext _context;

    public DistributorService(BillingDbContext context)
    {
        _context = context;
    }

    public async Task<DistributorResponse> CreateAsync(CreateDistributorRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new InvalidOperationException("Distributor name is required");

        if (string.IsNullOrWhiteSpace(request.Address))
            throw new InvalidOperationException("Distributor address is required");

        var distributor = new Distributor
        {
            Name = request.Name,
            Address = request.Address,
            Mobile = request.Mobile,
            Telephone = request.Telephone,
            Email = request.Email,
            GstNumber = request.GstNumber,
            OpeningBalance = request.OpeningBalance,
            ClosingBalance = request.OpeningBalance,
            DateOfJoin = DateTime.UtcNow
        };

        _context.Distributors.Add(distributor);
        await _context.SaveChangesAsync();

        return new DistributorResponse(
            distributor.Id,
            distributor.Name,
            distributor.Address,
            distributor.Mobile,
            distributor.OpeningBalance,
            distributor.PurchaseAmount,
            distributor.PaidAmount,
            distributor.ReturnedAmount,
            distributor.ClosingBalance,
            distributor.DateOfJoin
        );
    }

    public async Task<List<DistributorResponse>> GetAllAsync()
    {
        return await _context.Distributors
            .AsNoTracking()
            .Select(d => new DistributorResponse(
                d.Id,
                d.Name,
                d.Address,
                d.Mobile,
                d.OpeningBalance,
                d.PurchaseAmount,
                d.PaidAmount,
                d.ReturnedAmount,
                d.ClosingBalance,
                d.DateOfJoin
            ))
            .ToListAsync();
    }

    public async Task<DistributorResponse> UpdateAsync(int id, CreateDistributorRequest request)
    {
        var distributor = await _context.Distributors.FirstOrDefaultAsync(d => d.Id == id);
        if (distributor == null)
            throw new InvalidOperationException($"Distributor with ID {id} not found");

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new InvalidOperationException("Distributor name is required");

        if (string.IsNullOrWhiteSpace(request.Address))
            throw new InvalidOperationException("Distributor address is required");

        // Adjust closing balance based on the difference in opening balance
        var openingBalanceDiff = request.OpeningBalance - distributor.OpeningBalance;
        distributor.ClosingBalance += openingBalanceDiff;

        distributor.Name = request.Name;
        distributor.Address = request.Address;
        distributor.Mobile = request.Mobile;
        distributor.Telephone = request.Telephone;
        distributor.Email = request.Email;
        distributor.GstNumber = request.GstNumber;
        distributor.OpeningBalance = request.OpeningBalance;

        await _context.SaveChangesAsync();

        return new DistributorResponse(
            distributor.Id,
            distributor.Name,
            distributor.Address,
            distributor.Mobile,
            distributor.OpeningBalance,
            distributor.PurchaseAmount,
            distributor.PaidAmount,
            distributor.ReturnedAmount,
            distributor.ClosingBalance,
            distributor.DateOfJoin
        );
    }
}
