using Billing.Api.Models;
using Billing.Api.Services;
using FluentValidation;

namespace Billing.Api.Routes;

public static class PurchaseRoutes
{
    public static void MapPurchaseRoutes(this WebApplication app)
    {
        app.MapPost("/purchases",
            async (CreatePurchaseRequest request,
                   IPurchaseService purchaseService,
                   IValidator<CreatePurchaseRequest> validator) =>
            {
                var validation = await validator.ValidateAsync(request);
                if (!validation.IsValid)
                    return Results.BadRequest(validation.Errors);

                try
                {
                    var purchase = await purchaseService.CreatePurchaseAsync(request);
                    return Results.Created($"/purchases/{purchase.Id}", purchase);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

        app.MapPut("/purchases/{id}",
            async (int id, UpdatePurchaseRequest request, IPurchaseService purchaseService) =>
            {
                try
                {
                    var purchase = await purchaseService.UpdatePurchaseAsync(id, request);
                    return Results.Ok(purchase);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

        app.MapGet("/purchases", async (IPurchaseService purchaseService) =>
        {
            return await purchaseService.GetAllPurchasesAsync();
        });

        app.MapGet("/purchases/{id}",
            async (int id, IPurchaseService purchaseService) =>
            {
                var purchase = await purchaseService.GetPurchaseByIdAsync(id);
                return purchase is null ? Results.NotFound() : Results.Ok(purchase);
            });

        app.MapGet("/purchases/by-date/{startDate}/{endDate}",
            async (DateTime startDate, DateTime endDate, IPurchaseService purchaseService) =>
            {
                var purchases = await purchaseService.GetPurchasesByDateRangeAsync(startDate, endDate);
                return Results.Ok(purchases);
            });

        app.MapGet("/purchases/by-distributor/{distributorId}",
            async (int distributorId, IPurchaseService purchaseService) =>
            {
                var purchases = await purchaseService.GetPurchasesByDistributorAsync(distributorId);
                return Results.Ok(purchases);
            });

        app.MapPost("/purchases/{purchaseId}/payments",
            async (int purchaseId, CreatePurchasePaymentRequest request,
                   IPurchaseService purchaseService,
                   IValidator<CreatePurchasePaymentRequest> validator) =>
            {
                var validation = await validator.ValidateAsync(request);
                if (!validation.IsValid)
                    return Results.BadRequest(validation.Errors);

                try
                {
                    var purchase = await purchaseService.AddPaymentAsync(purchaseId, request);
                    return Results.Ok(purchase);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

        app.MapDelete("/purchases/payments/{paymentId}",
            async (int paymentId, IPurchaseService purchaseService) =>
            {
                try
                {
                    var result = await purchaseService.DeletePaymentAsync(paymentId);
                    return result ? Results.NoContent() : Results.NotFound();
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

        app.MapPost("/purchases/{purchaseId}/cancel",
            async (int purchaseId, IPurchaseService purchaseService) =>
            {
                try
                {
                    var result = await purchaseService.CancelPurchaseAsync(purchaseId);
                    return result ? Results.Ok(new { message = "Purchase cancelled successfully" })
                                 : Results.NotFound();
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

        app.MapGet("/purchases/outstanding/total",
            async (IPurchaseService purchaseService) =>
            {
                var total = await purchaseService.GetTotalOutstandingAsync();
                return Results.Ok(new { totalOutstanding = total });
            });

        app.MapGet("/purchases/summary/today",
            async (IPurchaseService purchaseService) =>
            {
                var today = DateTime.UtcNow.Date;
                var purchases = await purchaseService.GetPurchasesByDateRangeAsync(today, today.AddDays(1));

                var summary = new
                {
                    TotalPurchases = purchases.Count,
                    TotalAmount = purchases.Sum(p => p.TotalAmount),
                    TotalPaid = purchases.Sum(p => p.PaidAmount),
                    TotalBalance = purchases.Sum(p => p.BalanceAmount)
                };
                return Results.Ok(summary);
            });
    }
}
