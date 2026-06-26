using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Billing.Api.Data;
using Billing.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Billing.Api.Services;

public interface IStockTransferService
{
    Task<List<StockTransferResponse>> GetAllAsync();
    Task<StockTransferResponse> CreateAsync(CreateStockTransferRequest request);
}

public class StockTransferService : IStockTransferService
{
    private readonly BillingDbContext _context;

    public StockTransferService(BillingDbContext context)
    {
        _context = context;
    }

    public async Task<List<StockTransferResponse>> GetAllAsync()
    {
        return await _context.StockTransfers
            .Include(st => st.Product)
            .Include(st => st.Shop)
            .OrderByDescending(st => st.TransferDate)
            .ThenByDescending(st => st.Id)
            .Select(st => new StockTransferResponse
            {
                Id = st.Id,
                TransferDate = st.TransferDate,
                ProductId = st.ProductId,
                ProductName = st.Product.Name,
                Quantity = st.Quantity,
                TransferType = st.TransferType.ToString(),
                ShopId = st.ShopId,
                ShopName = st.Shop.Name,
                Price = st.Product.Price,
                Amount = st.Quantity * st.Product.Price
            })
            .ToListAsync();
    }

    public async Task<StockTransferResponse> CreateAsync(CreateStockTransferRequest request)
    {
        var product = await _context.Products.FindAsync(request.ProductId);
        if (product == null)
            throw new InvalidOperationException($"Product with ID {request.ProductId} not found.");

        var shop = await _context.Shops.FindAsync(request.ShopId);
        if (shop == null)
            throw new InvalidOperationException($"Shop with ID {request.ShopId} not found.");

        if (!Enum.TryParse<StockTransferType>(request.TransferType, out var transferType))
            throw new InvalidOperationException("Invalid TransferType. Must be 'In' or 'Out'.");

        if (request.Quantity <= 0)
            throw new InvalidOperationException("Quantity must be greater than 0.");

        var transfer = new StockTransferEntry
        {
            TransferDate = request.TransferDate,
            ProductId = request.ProductId,
            Quantity = request.Quantity,
            TransferType = transferType,
            ShopId = request.ShopId
        };

        _context.StockTransfers.Add(transfer);

        // Update product stock
        if (transferType == StockTransferType.In)
        {
            // Stock comes in from another shop
            product.Stock += request.Quantity;
        }
        else
        {
            // Stock goes out to another shop
            product.Stock -= request.Quantity;
        }

        await _context.SaveChangesAsync();

        return new StockTransferResponse
        {
            Id = transfer.Id,
            TransferDate = transfer.TransferDate,
            ProductId = transfer.ProductId,
            ProductName = product.Name,
            Quantity = transfer.Quantity,
            TransferType = transfer.TransferType.ToString(),
            ShopId = transfer.ShopId,
            ShopName = shop.Name,
            Price = product.Price,
            Amount = transfer.Quantity * product.Price
        };
    }
}
