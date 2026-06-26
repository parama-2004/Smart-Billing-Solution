using Billing.Api.Data;
using Billing.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Billing.Api.Services;

public interface IBarcodeService
{
    Task<List<BarcodeMasterResponse>> GetAllAsync();
    Task<List<BarcodeMasterResponse>> GetByProductIdAsync(int productId);
    Task<BarcodeMasterResponse?> GetByBarcodeValueAsync(string barcodeValue);
    Task<List<Product>> GetProductsByBarcodeValueAsync(string barcodeValue);
    Task<BarcodeMasterResponse> CreateAsync(CreateBarcodeRequest request);
    Task<BarcodeMasterResponse> UpdateAsync(int id, UpdateBarcodeRequest request);
    Task DeleteAsync(int id);
}

public class BarcodeService : IBarcodeService
{
    private readonly BillingDbContext _context;

    public BarcodeService(BillingDbContext context)
    {
        _context = context;
    }

    public async Task<List<BarcodeMasterResponse>> GetAllAsync()
    {
        try
        {
            var barcodes = await _context.Barcodes
                .Include(b => b.Product)
                .Where(b => b.IsActive)
                .Select(b => new
                {
                    b.Id,
                    b.BarcodeValue,
                    b.ProductId,
                    ProductName = b.Product.Name,
                    b.Price,
                    b.MRP,
                    b.CostPrice,
                    b.Variant,
                    b.BatchNumber,
                    b.GSTPercentage,
                    b.CreatedAt,
                    b.IsActive
                })
                .OrderBy(b => b.BarcodeValue)
                .ToListAsync();

            return barcodes.Select(b => new BarcodeMasterResponse(
                b.Id,
                b.BarcodeValue,
                b.ProductId,
                b.ProductName,
                b.Price,
                b.MRP,
                b.CostPrice,
                b.Variant,
                b.BatchNumber,
                b.GSTPercentage,
                b.CreatedAt,
                b.IsActive
            )).ToList();
        }
        catch (Exception ex)
        {
            // Log the error for debugging
            Console.WriteLine($"BarcodeService.GetAllAsync error: {ex.Message}");
            Console.WriteLine($"Stack: {ex.StackTrace}");
            throw;
        }
    }

    public async Task<List<BarcodeMasterResponse>> GetByProductIdAsync(int productId)
    {
        var barcodes = await _context.Barcodes
            .Include(b => b.Product)
            .Where(b => b.ProductId == productId && b.IsActive)
            .Select(b => new
            {
                b.Id,
                b.BarcodeValue,
                b.ProductId,
                ProductName = b.Product.Name,
                b.Price,
                b.MRP,
                b.CostPrice,
                b.Variant,
                b.BatchNumber,
                b.GSTPercentage,
                b.CreatedAt,
                b.IsActive
            })
            .OrderBy(b => b.BarcodeValue)
            .ToListAsync();
            
        return barcodes.Select(b => new BarcodeMasterResponse(
            b.Id,
            b.BarcodeValue,
            b.ProductId,
            b.ProductName,
            b.Price,
            b.MRP,
            b.CostPrice,
            b.Variant,
            b.BatchNumber,
            b.GSTPercentage,
            b.CreatedAt,
            b.IsActive
        )).ToList();
    }

    public async Task<BarcodeMasterResponse?> GetByBarcodeValueAsync(string barcodeValue)
    {
        var barcode = await _context.Barcodes
            .Include(b => b.Product)
            .FirstOrDefaultAsync(b => b.BarcodeValue == barcodeValue && b.IsActive);

        if (barcode == null)
            return null;

        return new BarcodeMasterResponse(
            barcode.Id,
            barcode.BarcodeValue,
            barcode.ProductId,
            barcode.Product.Name,
            barcode.Price,
            barcode.MRP,
            barcode.CostPrice,
            barcode.Variant,
            barcode.BatchNumber,
            barcode.GSTPercentage,
            barcode.CreatedAt,
            barcode.IsActive
        );
    }

    public async Task<List<Product>> GetProductsByBarcodeValueAsync(string barcodeValue)
    {
        return await _context.Barcodes
            .Where(b => b.BarcodeValue == barcodeValue && b.IsActive)
            .Include(b => b.Product)
            .Select(b => b.Product)
            .Distinct()
            .ToListAsync();
    }

    public async Task<BarcodeMasterResponse> CreateAsync(CreateBarcodeRequest request)
    {
        // Verify product exists
        var product = await _context.Products.FindAsync(request.ProductId);
        if (product == null)
            throw new InvalidOperationException($"Product with ID {request.ProductId} not found");



        var barcode = new Barcode
        {
            BarcodeValue = request.BarcodeValue,
            ProductId = request.ProductId,
            Price = request.Price,
            MRP = request.MRP,
            CostPrice = request.CostPrice,
            Variant = request.Variant,
            BatchNumber = request.BatchNumber,
            GSTPercentage = request.GSTPercentage,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Barcodes.Add(barcode);
        await _context.SaveChangesAsync();

        return new BarcodeMasterResponse(
            barcode.Id,
            barcode.BarcodeValue,
            barcode.ProductId,
            product.Name,
            barcode.Price,
            barcode.MRP,
            barcode.CostPrice,
            barcode.Variant,
            barcode.BatchNumber,
            barcode.GSTPercentage,
            barcode.CreatedAt,
            barcode.IsActive
        );
    }

    public async Task<BarcodeMasterResponse> UpdateAsync(int id, UpdateBarcodeRequest request)
    {
        var barcode = await _context.Barcodes
            .Include(b => b.Product)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (barcode == null)
            throw new InvalidOperationException($"Barcode with ID {id} not found");



        barcode.BarcodeValue = request.BarcodeValue;
        barcode.Price = request.Price;
        barcode.MRP = request.MRP;
        barcode.CostPrice = request.CostPrice;
        barcode.Variant = request.Variant;
        barcode.BatchNumber = request.BatchNumber;
        barcode.GSTPercentage = request.GSTPercentage;
        barcode.IsActive = request.IsActive;
        barcode.ModifiedAt = DateTime.UtcNow;

        _context.Barcodes.Update(barcode);
        await _context.SaveChangesAsync();

        return new BarcodeMasterResponse(
            barcode.Id,
            barcode.BarcodeValue,
            barcode.ProductId,
            barcode.Product.Name,
            barcode.Price,
            barcode.MRP,
            barcode.CostPrice,
            barcode.Variant,
            barcode.BatchNumber,
            barcode.GSTPercentage,
            barcode.CreatedAt,
            barcode.IsActive
        );
    }

    public async Task DeleteAsync(int id)
    {
        var barcode = await _context.Barcodes.FindAsync(id);
        if (barcode == null)
            throw new InvalidOperationException($"Barcode with ID {id} not found");

        _context.Barcodes.Remove(barcode);
        await _context.SaveChangesAsync();
    }
}
