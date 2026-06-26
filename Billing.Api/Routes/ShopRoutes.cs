using Billing.Api.Models;
using Billing.Api.Services;

namespace Billing.Api.Routes;

public static class ShopRoutes
{
    public static void MapShopRoutes(this WebApplication app)
    {
        // ─── Shop Master ───
        app.MapGet("/shops", async (IShopService shopService) =>
        {
            return Results.Ok(await shopService.GetAllAsync());
        });

        app.MapGet("/shops/{id:int}", async (int id, IShopService shopService) =>
        {
            var shop = await shopService.GetByIdAsync(id);
            return shop is null ? Results.NotFound() : Results.Ok(shop);
        });

        app.MapPost("/shops", async (CreateShopRequest request, IShopService shopService) =>
        {
            var shop = await shopService.CreateAsync(request);
            return Results.Created($"/shops/{shop.Id}", shop);
        });

        app.MapPut("/shops/{id:int}", async (int id, UpdateShopRequest request, IShopService shopService) =>
        {
            try
            {
                var shop = await shopService.UpdateAsync(id, request);
                return Results.Ok(shop);
            }
            catch (InvalidOperationException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
        });

        app.MapDelete("/shops/{id:int}", async (int id, IShopService shopService) =>
        {
            await shopService.DeleteAsync(id);
            return Results.NoContent();
        });

        // ─── Stock Transfers ───
        app.MapGet("/stock-transfers", async (IStockTransferService stService) =>
        {
            return Results.Ok(await stService.GetAllAsync());
        });

        app.MapPost("/stock-transfers", async (CreateStockTransferRequest request, IStockTransferService stService) =>
        {
            try
            {
                var st = await stService.CreateAsync(request);
                return Results.Created($"/stock-transfers/{st.Id}", st);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });
    }
}
