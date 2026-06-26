using Billing.Api.Models;
using Billing.Api.Security;

namespace Billing.Api.Data;

public static class DbSeeder
{
    public static void Seed(BillingDbContext context)
    {
        context.Database.EnsureCreated();

        if (!context.Users.Any())
        {
            context.Users.Add(new AppUser
            {
                Username = "admin",
                PasswordHash = PasswordHasher.Hash("admin123"),
                Role = UserRole.Admin,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });

            context.SaveChanges();
        }
    }
}