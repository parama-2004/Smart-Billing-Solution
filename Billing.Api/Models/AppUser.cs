using System;
using System.ComponentModel.DataAnnotations;

namespace Billing.Api.Models;

public enum UserRole
{
	Admin,
	User,
	Operator
}

public class AppUser
{
	[Key]
	public int Id { get; set; }

	[Required, MaxLength(50)]
	public string Username { get; set; } = null!;

	[Required]
	public string PasswordHash { get; set; } = null!;

	[Required]
	public UserRole Role { get; set; } = UserRole.User;

	public bool IsActive { get; set; } = true;

	public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
