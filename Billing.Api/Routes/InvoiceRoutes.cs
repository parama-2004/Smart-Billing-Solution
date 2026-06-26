using Billing.Api.Models;
using Billing.Api.Services;
using FluentValidation;

namespace Billing.Api.Routes;

public static class InvoiceRoutes
{
    public static void MapInvoiceRoutes(this WebApplication app)
    {
        app.MapPost("/invoices",
            async (CreateInvoiceRequest request,
                   IInvoiceService invoiceService,
                   IValidator<CreateInvoiceRequest> validator) =>
            {
                var validation = await validator.ValidateAsync(request);
                if (!validation.IsValid)
                    return Results.BadRequest(validation.Errors);

                try
                {
                    var invoice = await invoiceService.CreateAsync(request);
                    return Results.Created($"/invoices/{invoice.Id}", invoice);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

        app.MapPut("/invoices/{id:int}",
            async (int id, UpdateInvoiceRequest request,
                   IInvoiceService invoiceService) =>
            {
                try
                {
                    var invoice = await invoiceService.UpdateAsync(id, request);
                    return Results.Ok(invoice);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            })
            .WithName("UpdateInvoice");

        app.MapPut("/invoices/{id:int}/admin",
            async (int id, UpdateInvoiceRequest request,
                   IInvoiceService invoiceService) =>
            {
                try
                {
                    var invoice = await invoiceService.AdminUpdateAsync(id, request);
                    return Results.Ok(invoice);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            })
            .WithName("AdminUpdateInvoice");

        app.MapGet("/invoices/hold",
            async (IInvoiceService invoiceService) =>
            {
                var holdInvoices = await invoiceService.GetHoldInvoicesAsync();
                return Results.Ok(holdInvoices);
            })
            .WithName("GetHoldInvoices");

        app.MapGet("/invoices/by-number/{invoiceNumber}",
            async (string invoiceNumber, IInvoiceService service) =>
            {
                return await service.GetByInvoiceNumberAsync(invoiceNumber);
            });

        app.MapGet("/invoices/by-customer/{customerId:int}",
            async (int customerId, IInvoiceService invoiceService) =>
            {
                var customerInvoices = await invoiceService.GetByCustomerIdAsync(customerId);
                return Results.Ok(customerInvoices);
            })
            .WithName("GetInvoicesByCustomer");

        app.MapGet("/invoices/by-salesman/{salesmanId:int}",
            async (int salesmanId, IInvoiceService invoiceService) =>
            {
                var salesmanInvoices = await invoiceService.GetBySalesmanIdAsync(salesmanId);
                return Results.Ok(salesmanInvoices);
            })
            .WithName("GetInvoicesBySalesman");

        app.MapGet("/invoices", async (IInvoiceService invoiceService) =>
        {
            return await invoiceService.GetAllAsync();
        });

        app.MapGet("/invoices/reprint", async (int? limit, string? search, IInvoiceService invoiceService) =>
        {
            return await invoiceService.GetRecentForReprintAsync(limit ?? 10, search ?? string.Empty);
        })
        .WithName("GetReprintInvoices");

        app.MapGet("/invoices/today",
            async (IInvoiceService invoiceService) =>
            {
                var todayInvoices = await invoiceService.GetTodayInvoicesAsync();
                return Results.Ok(todayInvoices);
            })
            .WithName("GetTodayInvoices");

        app.MapGet("/invoices/by-date/{fromDate}/{toDate}",
            async (DateTime fromDate, DateTime toDate, IInvoiceService invoiceService) =>
            {
                var filteredInvoices = await invoiceService.GetByDateRangeAsync(fromDate, toDate);
                return Results.Ok(filteredInvoices);
            })
            .WithName("GetInvoicesByDateRange");

        app.MapGet("/invoices/summary",
            async (IInvoiceService invoiceService) =>
            {
                var summary = await invoiceService.GetInvoiceSummaryAsync();
                return Results.Ok(summary);
            })
            .WithName("GetInvoiceSummary");

        app.MapDelete("/invoices/{id:int}",
            async (int id, IInvoiceService invoiceService) =>
            {
                try
                {
                    var cancelRequest = new CancelInvoiceRequest(id, "Deleted by user");
                    var invoice = await invoiceService.CancelAsync(cancelRequest);
                    return Results.Ok(new { message = "Invoice cancelled successfully", invoice });
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            })
            .WithName("DeleteInvoice");

        app.MapPost("/invoices/cancel",
            async (CancelInvoiceRequest request, IInvoiceService invoiceService) =>
            {
                try
                {
                    var invoice = await invoiceService.CancelAsync(request);
                    return Results.Ok(invoice);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });
    }
}
