using Billing.Api.Models;
using Billing.Api.Services;

namespace Billing.Api.Routes;

public static class ChequeIssuedRoutes
{
    public static void MapChequeIssuedRoutes(this WebApplication app)
    {
        app.MapPost("/cheque-issued", async (CreateChequeIssuedRequest request, IChequeIssuedService service) =>
        {
            if (string.IsNullOrWhiteSpace(request.VendorName))
                return Results.BadRequest("Vendor is required");

            if (string.IsNullOrWhiteSpace(request.BillNo))
                return Results.BadRequest("Bill number is required");

            if (request.Amount <= 0)
                return Results.BadRequest("Amount must be greater than zero");

            try
            {
                return Results.Ok(await service.CreateAsync(request));
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(ex.Message);
            }
        });

        app.MapGet("/cheque-issued", async (DateTime? fromDate, DateTime? toDate, IChequeIssuedService service) =>
        {
            var rows = await service.GetByDateRangeAsync(fromDate, toDate);
            return Results.Ok(rows);
        });

        app.MapPut("/cheque-issued/{id:int}", async (int id, CreateChequeIssuedRequest request, IChequeIssuedService service) =>
        {
            if (string.IsNullOrWhiteSpace(request.VendorName))
                return Results.BadRequest("Vendor is required");

            if (string.IsNullOrWhiteSpace(request.BillNo))
                return Results.BadRequest("Bill number is required");

            if (request.Amount <= 0)
                return Results.BadRequest("Amount must be greater than zero");

            try
            {
                return Results.Ok(await service.UpdateAsync(id, request));
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(ex.Message);
            }
        });
    }
}
