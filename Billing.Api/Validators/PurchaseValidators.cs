using Billing.Api.Models;
using FluentValidation;
using System;

namespace Billing.Api.Validators;

public class CreatePurchaseRequestValidator : AbstractValidator<CreatePurchaseRequest>
{
    public CreatePurchaseRequestValidator()
    {
      //  RuleFor(x => x.DistributorId).NotEmpty().MaximumLength(50);
        RuleFor(x => x.DistributorName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.InvoiceNo).NotEmpty().MaximumLength(50);
        RuleFor(x => x.InvoiceDate).NotEmpty().LessThanOrEqualTo(DateTime.UtcNow);
        RuleFor(x => x.Date).NotEmpty().LessThanOrEqualTo(DateTime.UtcNow);
        RuleFor(x => x.Items).NotEmpty().WithMessage("At least one item is required");
        RuleForEach(x => x.Items).SetValidator(new PurchaseItemRequestValidator());
    }
}

public class PurchaseItemRequestValidator : AbstractValidator<PurchaseItemRequest>
{
    public PurchaseItemRequestValidator()
    {
        RuleFor(x => x.ProductId).GreaterThan(0);
        RuleFor(x => x.ProductName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Quantity).GreaterThan(0);
        RuleFor(x => x.UnitPrice).GreaterThan(0);
        RuleFor(x => x.PurchaseRate).GreaterThan(0);
        RuleFor(x => x.Mrp).GreaterThan(0);
        RuleFor(x => x.GstPercentage).InclusiveBetween(0, 100);
    }
}

public class CreatePurchasePaymentRequestValidator : AbstractValidator<CreatePurchasePaymentRequest>
{
    public CreatePurchasePaymentRequestValidator()
    {
        RuleFor(x => x.PaymentDate).NotEmpty().LessThanOrEqualTo(DateTime.UtcNow);
        RuleFor(x => x.Amount).GreaterThan(0);

        When(x => x.Mode == PaymentMode.Cheque || x.Mode == PaymentMode.DD, () =>
        {
            RuleFor(x => x.ChequeNo).NotEmpty().MaximumLength(50);
            RuleFor(x => x.ChequeDate).NotEmpty();
            RuleFor(x => x.BankName).NotEmpty().MaximumLength(100);
        });
    }
}