using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Billing.Api.Models;

public class Shop
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string City { get; set; } = string.Empty;
}

public class CreateShopRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
}

public class UpdateShopRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
}
