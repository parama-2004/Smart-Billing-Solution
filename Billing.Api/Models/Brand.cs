using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Billing.Api.Models;

public class Brand
{
    [Key]
    public int Id { get; set; }

    [Required]
    [StringLength(10)]
    public string BrandCode { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string BrandName { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}

public class BrandDto
{
    public int Id { get; set; }
    public string BrandCode { get; set; } = string.Empty;
    public string BrandName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class CreateBrandRequest
{
    [Required]
    [StringLength(10, MinimumLength = 1)]
    public string BrandCode { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string BrandName { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}

public class UpdateBrandRequest
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string BrandName { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}