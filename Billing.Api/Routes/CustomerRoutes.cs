using Billing.Api.Models;
using Billing.Api.Services;

namespace Billing.Api.Routes;

public static class CustomerRoutes
{
    public static void MapCustomerRoutes(this WebApplication app)
    {
        app.MapGet("/customers",
            async (ICustomerService customerService) =>
            {
                var customers = await customerService.GetAllAsync();
                return Results.Ok(customers);
            });

        app.MapPost("/customers",
            async (CreateCustomerRequest request, ICustomerService customerService) =>
            {
                try
                {
                    var customer = await customerService.CreateAsync(request);
                    return Results.Created($"/customers/{customer.Id}", customer);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

        app.MapPut("/customers/{customerId:int}",
            async (int customerId, UpdateCustomerRequest request, ICustomerService customerService) =>
            {
                try
                {
                    var customer = await customerService.UpdateAsync(customerId, request);
                    return Results.Ok(customer);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.NotFound(new { error = ex.Message });
                }
            });

        app.MapGet("/customers/{customerId:int}/ledger",
            async (int customerId, ICustomerService customerService) =>
            {
                try
                {
                    var summary = await customerService.GetLedgerSummaryAsync(customerId);
                    return Results.Ok(summary);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.NotFound(new { error = ex.Message });
                }
            });

        app.MapGet("/customers/{customerId:int}/cledger",
            async (int customerId, ICustomerService customerService) =>
            {
                try
                {
                    var summary = await customerService.GetLedgerCCAsync(customerId);
                    return Results.Ok(summary);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.NotFound(new { error = ex.Message });
                }
            });

        app.MapGet("/customers/{customerId:int}/statement",
            async (int customerId, DateTime from, DateTime to, ICustomerService customerService) =>
            {
                var result = await customerService.GetStatementAsync(customerId, from, to);
                return Results.Ok(result);
            });

        app.MapGet("/customers/{customerId:int}/statement/last-7-days",
            async (int customerId, ICustomerService customerService) =>
            {
                var to = DateTime.UtcNow;
                var from = to.AddDays(-7);
                return Results.Ok(await customerService.GetStatementAsync(customerId, from, to));
            });

        app.MapGet("/customers/{customerId:int}/statement/last-30-days",
            async (int customerId, ICustomerService customerService) =>
            {
                var to = DateTime.UtcNow;
                var from = to.AddDays(-30);
                return Results.Ok(await customerService.GetStatementAsync(customerId, from, to));
            });

        app.MapGet("/customers/{customerId:int}/statement/last-year",
            async (int customerId, ICustomerService customerService) =>
            {
                var to = DateTime.UtcNow;
                var from = to.AddYears(-1);
                return Results.Ok(await customerService.GetStatementAsync(customerId, from, to));
            });
    }
}
