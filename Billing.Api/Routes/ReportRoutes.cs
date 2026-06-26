using Billing.Api.Services;

namespace Billing.Api.Routes;

public static class ReportRoutes
{
    public static void MapReportRoutes(this WebApplication app)
    {
        static bool TryResolveRange(string type, DateTime? from, DateTime? to, out DateTime start, out DateTime end, out string? error)
        {
            end = DateTime.Today.AddDays(1);
            error = null;

            switch (type)
            {
                case "daily":
                    start = DateTime.Today;
                    return true;
                case "weekly":
                    start = DateTime.Today.AddDays(-7);
                    return true;
                case "monthly":
                    start = DateTime.Today.AddDays(-30);
                    return true;
                case "yearly":
                    start = DateTime.Today.AddDays(-366);
                    return true;
                case "range":
                    if (!from.HasValue || !to.HasValue)
                    {
                        start = default;
                        end = default;
                        error = "From & To required";
                        return false;
                    }

                    start = from.Value;
                    end = to.Value;
                    return true;
                default:
                    start = default;
                    end = default;
                    error = "Invalid report type";
                    return false;
            }
        }

        app.MapGet("/reports/sales", async (
            string type,
            DateTime? from,
            DateTime? to,
            ISalesReportService service) =>
        {
            if (!TryResolveRange(type, from, to, out var start, out var end, out var error))
                return Results.BadRequest(error);

            var result = await service.GetSalesReport(start, end);
            return Results.Ok(result);
        })
        .AllowAnonymous();

        app.MapGet("/reports/sales-vat", async (
            string type,
            DateTime? from,
            DateTime? to,
            ISalesReportService service) =>
        {
            if (!TryResolveRange(type, from, to, out var start, out var end, out var error))
                return Results.BadRequest(error);

            var result = await service.GetSalesVatReport(start, end);
            return Results.Ok(result);
        })
        .AllowAnonymous();

        app.MapGet("/reports/purchase-vat", async (
            string type,
            DateTime? from,
            DateTime? to,
            ISalesReportService service) =>
        {
            if (!TryResolveRange(type, from, to, out var start, out var end, out var error))
                return Results.BadRequest(error);

            var result = await service.GetPurchaseVatReport(start, end);
            return Results.Ok(result);
        })
        .AllowAnonymous();

        app.MapGet("/reports/sales-gst", async (
            string type,
            DateTime? from,
            DateTime? to,
            ISalesReportService service) =>
        {
            if (!TryResolveRange(type, from, to, out var start, out var end, out var error))
                return Results.BadRequest(error);

            var result = await service.GetSalesGstReport(start, end);
            return Results.Ok(result);
        })
        .AllowAnonymous();

        app.MapGet("/reports/purchase-gst", async (
            string type,
            DateTime? from,
            DateTime? to,
            ISalesReportService service) =>
        {
            if (!TryResolveRange(type, from, to, out var start, out var end, out var error))
                return Results.BadRequest(error);

            var result = await service.GetPurchaseGstReport(start, end);
            return Results.Ok(result);
        })
        .AllowAnonymous();
    }
}
