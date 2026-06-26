using Billing.Api.Models;
using Billing.Api.Services;
using FluentValidation;

namespace Billing.Api.Routes;

public static class MasterRoutes
{
    public static void MapMasterRoutes(this WebApplication app)
    {
        // ─── Shop Settings (public, no auth needed) ───
        app.MapGet("/shop-settings", (IConfiguration config) =>
        {
            var s = config.GetSection("ShopSettings");
            return Results.Ok(new
            {
                name         = s["Name"]           ?? "Shop",
                address      = s["Address"]         ?? "",
                state        = s["State"]           ?? "",
                phone        = s["Phone"]           ?? "",
                gstin        = s["Gstin"]           ?? "",
                whatsappNumber = s["WhatsappNumber"] ?? "",
                counterName  = s["CounterName"]     ?? ""
            });
        }).AllowAnonymous();

        // ─── Salesman ───
        app.MapPost("/salesmen", async (CreateSalesmanRequest r, ISalesmanService service) =>
            Results.Ok(await service.CreateAsync(r)));

        app.MapGet("/salesmen", async (ISalesmanService service) =>
            await service.GetAllAsync());

        app.MapPut("/salesmen/{id:int}", async (int id, CreateSalesmanRequest r, ISalesmanService service) =>
            Results.Ok(await service.UpdateAsync(id, r)));

        app.MapGet("/salesmen/compensation-summary", async (ISalesmanCompensationService service) =>
            Results.Ok(await service.GetSummaryAsync()));

        app.MapGet("/salesmen/{id:int}/compensation", async (int id, ISalesmanCompensationService service) =>
            Results.Ok(await service.GetDetailsBySalesmanAsync(id)));

        // ─── Distributor ───
        app.MapPost("/distributors",
            async (CreateDistributorRequest request, IDistributorService service) =>
            {
                var distributor = await service.CreateAsync(request);
                return Results.Created($"/distributors/{distributor.Id}", distributor);
            });

        app.MapGet("/distributors",
            async (IDistributorService service) => Results.Ok(await service.GetAllAsync()));

        app.MapPut("/distributors/{id:int}",
            async (int id, CreateDistributorRequest request, IDistributorService service) =>
            {
                try
                {
                    var distributor = await service.UpdateAsync(id, request);
                    return Results.Ok(distributor);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

        // ─── Distributor Orders ───
        app.MapPost("/distributor-orders",
            async (CreateDistributorOrderRequest request, IDistributorOrderService service) =>
            {
                try
                {
                    var order = await service.CreateAsync(request);
                    return Results.Created($"/distributor-orders/{order.Id}", order);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

        app.MapGet("/distributor-orders", async (IDistributorOrderService service) =>
        {
            return Results.Ok(await service.GetAllAsync());
        });

        app.MapPut("/distributor-orders/{orderId:int}/status",
            async (int orderId, UpdateDistributorOrderStatusRequest request,
                   IDistributorOrderService service) =>
            {
                var order = await service.UpdateStatusAsync(orderId, request.Status);
                return Results.Ok(order);
            });

        app.MapGet("/distributor-orders/{orderId:int}",
            async (int orderId, IDistributorOrderService service) =>
            {
                try
                {
                    return Results.Ok(await service.GetByIdAsync(orderId));
                }
                catch (InvalidOperationException ex)
                {
                    return Results.NotFound(new { error = ex.Message });
                }
            });

        // ─── Brands ───
        app.MapPost("/brands",
            async (CreateBrandRequest request,
                   IBrandService brandService,
                   IValidator<CreateBrandRequest> validator) =>
            {
                var validation = await validator.ValidateAsync(request);
                if (!validation.IsValid)
                    return Results.BadRequest(validation.Errors);

                try
                {
                    var brand = await brandService.CreateAsync(request);
                    return Results.Created($"/brands/{brand.Id}", brand);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

        app.MapGet("/brands", async (IBrandService brandService) =>
        {
            return await brandService.GetAllAsync();
        });

        app.MapGet("/brands/{id}",
            async (int id, IBrandService brandService) =>
            {
                var brand = await brandService.GetByIdAsync(id);
                return brand is null ? Results.NotFound() : Results.Ok(brand);
            });

        app.MapPut("/brands/{id}",
            async (int id, UpdateBrandRequest request,
                   IBrandService brandService,
                   IValidator<UpdateBrandRequest> validator) =>
            {
                var validation = await validator.ValidateAsync(request);
                if (!validation.IsValid)
                    return Results.BadRequest(validation.Errors);

                try
                {
                    var brand = await brandService.UpdateAsync(id, request);
                    return Results.Ok(brand);
                }
                catch (InvalidOperationException ex)
                {
                    if (ex.Message.Contains("not found"))
                        return Results.NotFound();
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

        app.MapGet("/brands/exists/code/{brandCode}",
            async (string brandCode, IBrandService brandService) =>
            {
                var exists = await brandService.ExistsByCodeAsync(brandCode);
                return Results.Ok(exists);
            });

        app.MapGet("/brands/exists/name/{brandName}",
            async (string brandName, IBrandService brandService) =>
            {
                var exists = await brandService.ExistsByNameAsync(brandName);
                return Results.Ok(exists);
            });

        app.MapGet("/brands/active",
            async (IBrandService brandService) =>
            {
                var brands = await brandService.GetAllAsync();
                var activeBrands = brands.Where(b => b.IsActive).ToList();
                return Results.Ok(activeBrands);
            });

        // ─── Categories ───
        app.MapPost("/categories",
            async (CreateCategoryRequest request,
                   ICategoryService categoryService,
                   IValidator<CreateCategoryRequest> validator) =>
            {
                var validation = await validator.ValidateAsync(request);
                if (!validation.IsValid)
                    return Results.BadRequest(validation.Errors);

                try
                {
                    var category = await categoryService.CreateAsync(request);
                    return Results.Created($"/categories/{category.Id}", category);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

        app.MapGet("/categories", async (ICategoryService categoryService) =>
        {
            return await categoryService.GetAllAsync();
        });

        app.MapGet("/categories/{id}",
            async (int id, ICategoryService categoryService) =>
            {
                var category = await categoryService.GetByIdAsync(id);
                return category is null ? Results.NotFound() : Results.Ok(category);
            });

        app.MapPut("/categories/{id}",
            async (int id, UpdateCategoryRequest request,
                   ICategoryService categoryService,
                   IValidator<UpdateCategoryRequest> validator) =>
            {
                var validation = await validator.ValidateAsync(request);
                if (!validation.IsValid)
                    return Results.BadRequest(validation.Errors);

                try
                {
                    var category = await categoryService.UpdateAsync(id, request);
                    return Results.Ok(category);
                }
                catch (InvalidOperationException ex)
                {
                    if (ex.Message.Contains("not found"))
                        return Results.NotFound();
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

        app.MapGet("/categories/exists/code/{categoryCode}",
            async (string categoryCode, ICategoryService categoryService) =>
            {
                var exists = await categoryService.ExistsByCodeAsync(categoryCode);
                return Results.Ok(exists);
            });

        app.MapGet("/categories/exists/name/{categoryName}",
            async (string categoryName, ICategoryService categoryService) =>
            {
                var exists = await categoryService.ExistsByNameAsync(categoryName);
                return Results.Ok(exists);
            });

        app.MapGet("/categories/active",
            async (ICategoryService categoryService) =>
            {
                var categories = await categoryService.GetAllAsync();
                var activeCategories = categories.Where(c => c.IsActive).ToList();
                return Results.Ok(activeCategories);
            });

        // ─── Gifts ───
        app.MapPost("/gifts",
            async (CreateGiftProductRequest request, IGiftService giftService) =>
            {
                try
                {
                    var gift = await giftService.CreateAsync(request);
                    return Results.Created($"/gifts/{gift.Id}", gift);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

        app.MapGet("/gifts",
            async (IGiftService giftService) => Results.Ok(await giftService.GetAllAsync()));

        app.MapPut("/gifts/{id:int}",
            async (int id, UpdateGiftProductRequest request, IGiftService giftService) =>
            {
                try
                {
                    var gift = await giftService.UpdateAsync(id, request);
                    return Results.Ok(gift);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

        app.MapGet("/gifts/redeemed",
            async (IGiftService giftService) => Results.Ok(await giftService.GetRedeemedGiftItemsAsync()));

        // ─── Banks ───
        app.MapGet("/banks", async (IBankService bankService) =>
        {
            return Results.Ok(await bankService.GetAllAsync());
        });

        app.MapGet("/banks/{id:int}", async (int id, IBankService bankService) =>
        {
            var bank = await bankService.GetByIdAsync(id);
            return bank is null ? Results.NotFound() : Results.Ok(bank);
        });

        app.MapPost("/banks", async (CreateBankRequest request, IBankService bankService) =>
        {
            try
            {
                var bank = await bankService.CreateAsync(request.Name);
                return Results.Created($"/banks/{bank.Id}", bank);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        app.MapPut("/banks/{id:int}", async (int id, UpdateBankRequest request, IBankService bankService) =>
        {
            try
            {
                var bank = await bankService.UpdateAsync(id, request.Name);
                return Results.Ok(bank);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        app.MapDelete("/banks/{id:int}", async (int id, IBankService bankService) =>
        {
            await bankService.DeleteAsync(id);
            return Results.NoContent();
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));
    }
}

public record CreateBankRequest(string Name);
public record UpdateBankRequest(string Name);
