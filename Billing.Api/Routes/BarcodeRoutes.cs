using Billing.Api.Models;
using Billing.Api.Services;

namespace Billing.Api.Routes;

public static class BarcodeRoutes
{
    public static void MapBarcodeRoutes(this WebApplication app)
    {
        var group = app.MapGroup("/barcodes")
            .WithTags("Barcodes");

        // Get all barcodes
        group.MapGet("/", GetAllBarcodes)
            .WithName("GetAllBarcodes")
            .WithOpenApi();

        // Get barcodes by product ID
        group.MapGet("/product/{productId}", GetBarcodesByProductId)
            .WithName("GetBarcodesByProductId")
            .WithOpenApi();

        // Get barcode by barcode value
        group.MapGet("/value/{barcodeValue}", GetByBarcodeValue)
            .WithName("GetByBarcodeValue")
            .WithOpenApi();

        // Get all products with a specific barcode (multiple products with same barcode)
        group.MapGet("/products/{barcodeValue}", GetProductsByBarcodeValue)
            .WithName("GetProductsByBarcodeValue")
            .WithOpenApi();

        // Create new barcode
        group.MapPost("/", CreateBarcode)
            .WithName("CreateBarcode")
            .WithOpenApi();

        // Update barcode
        group.MapPut("/{id}", UpdateBarcode)
            .WithName("UpdateBarcode")
            .WithOpenApi();

        // Delete barcode
        group.MapDelete("/{id}", DeleteBarcode)
            .WithName("DeleteBarcode")
            .WithOpenApi();
    }

    private static async Task<IResult> GetAllBarcodes(IBarcodeService service)
    {
        try
        {
            var barcodes = await service.GetAllAsync();
            // Return empty list if no barcodes exist (instead of error)
            return Results.Ok(barcodes ?? new List<BarcodeMasterResponse>());
        }
        catch (Exception ex)
        {
            // Log the exception details for debugging
            Console.WriteLine($"Error in GetAllBarcodes: {ex.Message}");
            Console.WriteLine($"Stack Trace: {ex.StackTrace}");
            return Results.InternalServerError();
        }
    }

    private static async Task<IResult> GetBarcodesByProductId(int productId, IBarcodeService service)
    {
        try
        {
            var barcodes = await service.GetByProductIdAsync(productId);
            // Return empty list if no barcodes found for product
            return Results.Ok(barcodes ?? new List<BarcodeMasterResponse>());
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetBarcodesByProductId: {ex.Message}");
            Console.WriteLine($"Stack Trace: {ex.StackTrace}");
            return Results.InternalServerError();
        }
    }

    private static async Task<IResult> GetByBarcodeValue(string barcodeValue, IBarcodeService service)
    {
        try
        {
            var barcode = await service.GetByBarcodeValueAsync(barcodeValue);
            if (barcode == null)
                return Results.NotFound();

            return Results.Ok(barcode);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetByBarcodeValue: {ex.Message}");
            Console.WriteLine($"Stack Trace: {ex.StackTrace}");
            return Results.InternalServerError();
        }
    }

    private static async Task<IResult> GetProductsByBarcodeValue(string barcodeValue, IBarcodeService service)
    {
        try
        {
            var products = await service.GetProductsByBarcodeValueAsync(barcodeValue);
            return Results.Ok(products ?? new List<Product>());
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetProductsByBarcodeValue: {ex.Message}");
            Console.WriteLine($"Stack Trace: {ex.StackTrace}");
            return Results.InternalServerError();
        }
    }

    private static async Task<IResult> CreateBarcode(CreateBarcodeRequest request, IBarcodeService service)
    {
        try
        {
            var barcode = await service.CreateAsync(request);
            return Results.Created($"/barcodes/{barcode.Id}", barcode);
        }
        catch (InvalidOperationException ex)
        {
            Console.WriteLine($"Error in CreateBarcode: {ex.Message}");
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in CreateBarcode: {ex.Message}");
            Console.WriteLine($"Stack Trace: {ex.StackTrace}");
            return Results.InternalServerError();
        }
    }

    private static async Task<IResult> UpdateBarcode(int id, UpdateBarcodeRequest request, IBarcodeService service)
    {
        try
        {
            var barcode = await service.UpdateAsync(id, request);
            return Results.Ok(barcode);
        }
        catch (InvalidOperationException ex)
        {
            Console.WriteLine($"Error in UpdateBarcode: {ex.Message}");
            if (ex.Message.Contains("not found"))
                return Results.NotFound();
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in UpdateBarcode: {ex.Message}");
            Console.WriteLine($"Stack Trace: {ex.StackTrace}");
            return Results.InternalServerError();
        }
    }

    private static async Task<IResult> DeleteBarcode(int id, IBarcodeService service)
    {
        try
        {
            await service.DeleteAsync(id);
            return Results.NoContent();
        }
        catch (InvalidOperationException ex)
        {
            Console.WriteLine($"Error in DeleteBarcode: {ex.Message}");
            return Results.NotFound();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in DeleteBarcode: {ex.Message}");
            Console.WriteLine($"Stack Trace: {ex.StackTrace}");
            return Results.InternalServerError();
        }
    }
}
