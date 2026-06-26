using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using Billing.Api.Models;
using Billing.Api.Data;


namespace Billing.Api.Services;

public class SalesmanService : ISalesmanService
{
    private readonly BillingDbContext _context;

    public SalesmanService(BillingDbContext context)
    {
        _context = context;
    }

    public async Task<SalesmanResponse> CreateAsync(CreateSalesmanRequest r)
    {
        var s = new Salesman
        {
            Name = r.Name,
            DateOfBirth = r.DateOfBirth,
            Address = r.Address,
            City = r.City,
            Mobile = r.Mobile,
            DateOfJoin = r.DateOfJoin,
            IsActive = r.IsActive
        };

        _context.Salesmen.Add(s);
        await _context.SaveChangesAsync();

        return Map(s);
    }

    public async Task<List<SalesmanResponse>> GetAllAsync()
    {
        return await _context.Salesmen
            .OrderBy(s => s.Name)
            .Select(s => Map(s))
            .ToListAsync();
    }

    public async Task<SalesmanResponse> UpdateAsync(int id, CreateSalesmanRequest r)
    {
        var s = await _context.Salesmen.FindAsync(id)
            ?? throw new InvalidOperationException("Salesman not found");

        s.Name = r.Name;
        s.DateOfBirth = r.DateOfBirth;
        s.Address = r.Address;
        s.City = r.City;
        s.Mobile = r.Mobile;
        s.DateOfJoin = r.DateOfJoin;
        s.IsActive = r.IsActive;

        await _context.SaveChangesAsync();
        return Map(s);
    }

    private static SalesmanResponse Map(Salesman s) =>
        new(s.Id, s.Name, s.Mobile, s.City, s.IsActive);
}
