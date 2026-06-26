using Billing.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Billing.Api.Routes
{
    public static class PrintRoutes
    {
        public static void MapPrintRoutes(this WebApplication app)
        {
            var group = app.MapGroup("/api/print")
                           .RequireAuthorization();

            group.MapPost("/raw", ([FromBody] RawPrintRequest request) =>
            {
                if (string.IsNullOrWhiteSpace(request.PrinterName))
                    return Results.BadRequest(new { message = "Printer name is required." });

                if (string.IsNullOrWhiteSpace(request.Base64Data))
                    return Results.BadRequest(new { message = "Base64 data is required." });

                try
                {
                    byte[] bytes = Convert.FromBase64String(request.Base64Data);
                    bool success = RawPrinterHelper.SendBytesToPrinter(request.PrinterName, bytes);

                    if (success)
                    {
                        return Results.Ok(new { success = true });
                    }
                    else
                    {
                        return Results.BadRequest(new { message = "Failed to send bytes to printer. Ensure printer name is correct." });
                    }
                }
                catch (Exception ex)
                {
                    return Results.Problem(ex.Message);
                }
            });
        }
    }

    public class RawPrintRequest
    {
        public string PrinterName { get; set; } = string.Empty;
        public string Base64Data { get; set; } = string.Empty;
    }
}
