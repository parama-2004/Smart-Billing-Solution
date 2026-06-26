using Billing.Api.Models;
using Billing.Api.Services;
using FluentValidation;

namespace Billing.Api.Routes;

public static class ProductRoutes
{
    public static void MapProductRoutes(this WebApplication app)
    {
        app.MapPost("/products",
            async (CreateProductRequest request,
                   IProductService productService,
                   IValidator<CreateProductRequest> validator) =>
            {
                var validation = await validator.ValidateAsync(request);
                if (!validation.IsValid)
                    return Results.BadRequest(validation.Errors);

                try
                {
                    var product = await productService.AddAsync(request);
                    return Results.Created($"/products/{product.Id}", product);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

        app.MapGet("/products", async (IProductService productService) =>
        {
            return await productService.GetAllAsync();
        });

        app.MapPut("/products/{id}",
            async (int id, CreateProductRequest request,
                   IProductService productService,
                   IValidator<CreateProductRequest> validator) =>
            {
                var validation = await validator.ValidateAsync(request);
                if (!validation.IsValid)
                    return Results.BadRequest(validation.Errors);

                try
                {
                    var product = await productService.UpdateAsync(id, request);
                    return Results.Ok(product);
                }
                catch (InvalidOperationException ex)
                {
                    if (ex.Message.Contains("not found"))
                        return Results.NotFound();
                    return Results.BadRequest(new { error = ex.Message });
                }
            });
    }
}
