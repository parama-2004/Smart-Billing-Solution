using System.ComponentModel.DataAnnotations;

namespace Billing.Api.Models;

public class UpdateCustomerRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = null!;

    [Required]
    [MaxLength(15)]
    public string Mobile { get; set; } = null!;

    [Required]
    [MaxLength(250)]
    public string Address { get; set; } = null!;

    [MaxLength(15)]
    public string? Telephone { get; set; }

    [MaxLength(100)]
    [EmailAddress]
    public string? Email { get; set; }
}
