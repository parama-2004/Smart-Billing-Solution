using Billing.Api.Models;
using Billing.Api.Services;

namespace Billing.Api.Routes;

public static class PaymentRoutes
{
    public static void MapPaymentRoutes(this WebApplication app)
    {
        // Payment endpoints
        app.MapPost("/payments",
            async (CreatePaymentRequest request, IPaymentService paymentService) =>
            {
                try
                {
                    var invoice = await paymentService.PayAsync(request);
                    return Results.Ok(invoice);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

        app.MapGet("/invoices/{invoiceId:int}/payments",
            async (int invoiceId, IPaymentService paymentService) =>
            {
                try
                {
                    var payments = await paymentService.GetPaymentsForInvoiceAsync(invoiceId);
                    return Results.Ok(payments);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.NotFound(new { error = ex.Message });
                }
            });

        // Refund endpoints
        app.MapPost("/refunds",
            async (CreateRefundRequest request, IRefundService refundService) =>
            {
                try
                {
                    var invoice = await refundService.RefundAsync(request);
                    return Results.Ok(invoice);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

        app.MapGet("/invoices/{invoiceId:int}/refunds",
            async (int invoiceId, IRefundService refundService) =>
            {
                var refunds = await refundService.GetRefundsForInvoiceAsync(invoiceId);
                return Results.Ok(refunds);
            });
    }
}
