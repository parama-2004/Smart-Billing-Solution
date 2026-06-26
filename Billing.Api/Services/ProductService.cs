using Billing.Api.Data;
using Billing.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Billing.Api.Services;

public class ProductService : IProductService
{
    private readonly BillingDbContext _db;

    public ProductService(BillingDbContext db)
    {
        _db = db;
    }

    public async Task<List<ProductResponse>> GetAllAsync()
    {
        return await _db.Products
            .Include(p => p.Distributor)
            .Include(p => p.Barcodes)
            .AsNoTracking()
            .Select(p => new ProductResponse(
                p.Id,
                p.Name,
                p.Price,
                p.Stock,
                p.MRP,
                p.CostPrice,
                p.GstPercentage,
                p.DistributorId,
                p.Distributor.Name,
                null,
                p.HsnCode,
                p.BrandCode,      // Added
                p.CategoryCode,   // Added
                p.Barcodes.Select(b => new BarcodeMasterResponse(
                    b.Id,
                    b.BarcodeValue,
                    b.ProductId,
                    p.Name,
                    b.Price,
                    b.MRP,
                    b.CostPrice,
                    b.Variant,
                    b.BatchNumber,
                    b.GSTPercentage,
                    b.CreatedAt,
                    b.IsActive
                )).ToList()
            ))
            .ToListAsync();
    }

    public async Task<ProductResponse> UpdateAsync(int id, CreateProductRequest request)
    {
        var product = await _db.Products
            .Include(p => p.Distributor)
            .Include(p => p.Barcodes)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (product == null)
            throw new InvalidOperationException("Product not found");

        product.Name = request.Name;
        product.Price = request.Price;
        product.MRP = request.MRP;
        product.CostPrice = request.CostPrice;
        product.GstPercentage = request.GstPercentage;
        product.Stock = request.Stock;
        product.DistributorId = request.DistributorId;
        product.HsnCode = request.HsnCode;
        product.BrandCode = request.BrandCode;      // Added
        product.CategoryCode = request.CategoryCode; // Added

        await _db.SaveChangesAsync();

        return new ProductResponse(
            product.Id,
            product.Name,
            product.Price,
            product.Stock,
            product.MRP,
            product.CostPrice,
            product.GstPercentage,
            product.DistributorId,
            product.Distributor.Name,
            null,
            product.HsnCode,
            product.BrandCode,      // Added
            product.CategoryCode,    // Added
            product.Barcodes.Select(b => new BarcodeMasterResponse(
                b.Id,
                b.BarcodeValue,
                b.ProductId,
                product.Name,
                b.Price,
                b.MRP,
                b.CostPrice,
                b.Variant,
                b.BatchNumber,
                b.GSTPercentage,
                b.CreatedAt,
                b.IsActive
            )).ToList()
        );
    }

    public async Task<Product> AddAsync(CreateProductRequest request)
    {
        var distributor = await _db.Distributors
            .FirstOrDefaultAsync(d => d.Id == request.DistributorId)
            ?? throw new InvalidOperationException("Distributor not found");

        var product = new Product
        {
            Name = request.Name,
            Price = request.Price,
            DistributorId = distributor.Id,
            Stock = request.Stock,
            MRP = request.MRP,
            CostPrice = request.CostPrice,
            GstPercentage = request.GstPercentage,
            HsnCode = request.HsnCode,
            BrandCode = request.BrandCode,      // Added
            CategoryCode = request.CategoryCode  // Added
        };

        _db.Products.Add(product);

        // Update distributor ledger
        distributor.PurchaseAmount += request.Price;
        distributor.ClosingBalance =
            distributor.OpeningBalance +
            distributor.PurchaseAmount -
            distributor.PaidAmount -
            distributor.ReturnedAmount;

        await _db.SaveChangesAsync();

        return product;
    }
}