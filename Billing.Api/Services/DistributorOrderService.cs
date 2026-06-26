using Billing.Api.Data;
using Billing.Api.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Billing.Api.Services;

public class DistributorOrderService : IDistributorOrderService
{
    private readonly BillingDbContext _context;

    public DistributorOrderService(BillingDbContext context)
    {
        _context = context;
    }

    public async Task<DistributorOrderResponse> CreateAsync(CreateDistributorOrderRequest request)
    {
        var distributor = await _context.Distributors
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == request.DistributorId)
            ?? throw new InvalidOperationException("Distributor not found");

        if (request.Items == null || request.Items.Count == 0)
            throw new InvalidOperationException("Order must contain at least one item");

        var order = new DistributorOrder
        {
            DistributorId = distributor.Id,
            DistributorCode = request.DistributorCode,
            DistributorName = distributor.Name,
            DistributorPhone = distributor.Mobile ?? "",
            DistributorAddress = distributor.Address,
            ContactPerson = request.ContactPerson,
            OrderDate = request.OrderDate,
            ExpectedDeliveryDate = request.ExpectedDeliveryDate,
            Notes = request.Notes,
            Priority = request.Priority,
            TotalAmount = request.TotalAmount,
            Status = Enum.Parse<DistributorOrderStatus>(request.Status, true),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        foreach (var item in request.Items)
        {
            order.Items.Add(new DistributorOrderItem
            {
                ProductId = item.ProductId,
                ProductName = item.ProductName,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                TotalPrice = item.TotalPrice,
                BarCode = item.BarCode,
                HsnCode = item.HsnCode
            });
        }

        _context.DistributorOrders.Add(order);
        await _context.SaveChangesAsync();

        return MapResponse(order);
    }

    public async Task<List<DistributorOrderResponse>> GetAllAsync()
    {
        return await _context.DistributorOrders
            .Include(o => o.Items)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => MapResponse(o))
            .ToListAsync();
    }

    public async Task<DistributorOrderResponse> GetByIdAsync(int orderId)
    {
        var order = await _context.DistributorOrders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId)
            ?? throw new InvalidOperationException("Order not found");

        return MapResponse(order);
    }

    public async Task<DistributorOrderResponse> UpdateStatusAsync(
        int orderId,
        DistributorOrderStatus status)
    {
        var order = await _context.DistributorOrders
            .FirstOrDefaultAsync(o => o.Id == orderId)
            ?? throw new InvalidOperationException("Order not found");

        // Prevent illegal transitions
        if (order.Status == DistributorOrderStatus.Cancelled ||
            order.Status == DistributorOrderStatus.Delivered)
            throw new InvalidOperationException("Order status cannot be changed");

        order.Status = status;
        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapResponse(order);
    }

    private static DistributorOrderResponse MapResponse(DistributorOrder order)
    {
        return new DistributorOrderResponse(
            order.Id,
            order.DistributorId,
            order.DistributorCode,
            order.DistributorName,
            order.DistributorPhone,
            order.DistributorAddress,
            order.ContactPerson,
            order.OrderDate,
            order.ExpectedDeliveryDate,
            order.Items.Select(i =>
                new DistributorOrderItemResponse(
                    i.Id,
                    order.Id,
                    i.ProductId,
                    i.ProductName,
                    i.Quantity,
                    i.UnitPrice,
                    i.TotalPrice,
                    i.BarCode,
                    i.HsnCode
                )).ToList(),
            order.Notes,
            order.Priority,
            order.TotalAmount,
            order.Status,
            order.CreatedAt,
            order.UpdatedAt
        );
    }
}
