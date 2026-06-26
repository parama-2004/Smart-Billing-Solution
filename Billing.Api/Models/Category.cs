using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Billing.Api.Models;

public class Category
{
    [Key]
    public int Id { get; set; }

    [Required]
    [StringLength(10)]
    public string CategoryCode { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string CategoryName { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}

public class CategoryDto
{
    public int Id { get; set; }
    public string CategoryCode { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class CreateCategoryRequest
{
    [Required]
    [StringLength(10, MinimumLength = 1)]
    public string CategoryCode { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string CategoryName { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}

public class UpdateCategoryRequest
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string CategoryName { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}