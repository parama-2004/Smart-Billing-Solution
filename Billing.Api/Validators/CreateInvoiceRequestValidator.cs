using Billing.Api.Models;
using FluentValidation;

namespace Billing.Api.Validators;

public class CreateInvoiceRequestValidator
    : AbstractValidator<CreateInvoiceRequest>
{
    public CreateInvoiceRequestValidator()
    {
       // RuleFor(x => x.CustomerId)
          //  .NotEmpty().WithMessage("Customer id is required");

        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("At least one item is required");

        RuleForEach(x => x.Items).ChildRules(items =>
        {
            items.RuleFor(i => i.ProductId).GreaterThan(0);
            items.RuleFor(i => i.Quantity).NotEqual(0);
        });

        When(x => x.Redemption != null, () =>
        {
            RuleFor(x => x.Redemption!.Type)
                .NotEmpty().WithMessage("Redemption type is required");

            RuleFor(x => x.Redemption!.Points)
                .GreaterThan(0).WithMessage("Redeem points must be greater than zero");
        });
    }
}
