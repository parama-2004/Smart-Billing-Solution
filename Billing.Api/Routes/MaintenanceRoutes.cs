using Billing.Api.Services;

namespace Billing.Api.Routes;

public static class MaintenanceRoutes
{
    public static void MapMaintenanceRoutes(this WebApplication app)
    {
        app.MapPost("/maintenance/backup", async (
            SuperAdminPasswordRequest request,
            IMaintenanceService maintenanceService) =>
        {
            if (!await maintenanceService.ValidateSuperAdminPasswordAsync(request.Password))
                return Results.Unauthorized();

            var file = await maintenanceService.BuildBackupFileAsync();
            var fileName = $"billing-backup-{DateTime.Now:yyyyMMdd-HHmmss}.zip";
            return Results.File(file, "application/zip", fileName);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        app.MapPost("/maintenance/annual-reset", async (
            SuperAdminPasswordRequest request,
            IMaintenanceService maintenanceService) =>
        {
            if (!await maintenanceService.ValidateSuperAdminPasswordAsync(request.Password))
                return Results.Unauthorized();

            await maintenanceService.AnnualResetAsync();
            return Results.Ok(new { message = "Annual reset completed successfully." });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));
    }
}

public record SuperAdminPasswordRequest(string Password);
