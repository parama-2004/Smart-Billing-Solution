using Billing.Api.Models;
using Billing.Api.Services;

namespace Billing.Api.Routes;

public static class DailyTallyRoutes
{
    public static void MapDailyTallyRoutes(this WebApplication app)
    {
        app.MapPost("/daily-tally", async (SaveDailyTallyRequest request, IDailyTallyService service) =>
        {
            if (request.TallyDate == default)
                return Results.BadRequest("Tally date is required");

            var result = await service.SaveAsync(request);
            return Results.Ok(result);
        })
        .AllowAnonymous();

        app.MapGet("/daily-tally/by-date", async (DateTime date, IDailyTallyService service) =>
        {
            if (date == default)
                return Results.BadRequest("Date is required");

            var result = await service.GetByDateAsync(date);
            return result is null ? Results.NotFound() : Results.Ok(result);
        })
        .AllowAnonymous();

        app.MapGet("/daily-tally/annual", async (int? year, DateTime? from, DateTime? to, string? expenseName, IDailyTallyService service) =>
        {
            if (from.HasValue ^ to.HasValue)
                return Results.BadRequest("Both from and to dates are required for range filter");

            if (!from.HasValue && !to.HasValue)
            {
                if (!year.HasValue || year.Value < 2000 || year.Value > 2200)
                    return Results.BadRequest("Invalid year");
            }

            var result = await service.GetAnnualReportAsync(year, from, to, expenseName);
            return Results.Ok(result);
        })
        .AllowAnonymous();
    }
}
