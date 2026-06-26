using Billing.Api.Data;
using Billing.Api.Models;
using Billing.Api.Security;
using Microsoft.EntityFrameworkCore;

namespace Billing.Api.Services;

public interface IUserService
{
    Task<AppUser?> ValidateUserAsync(string username, string password);
    Task<AppUser> CreateUserAsync(string username, string password, UserRole role);
    Task ChangePasswordAsync(int userId, string oldPassword, string newPassword);
    Task ToggleUserStatusAsync(int userId);
    Task<List<AppUser>> GetAllAsync();
    Task<bool> VerifyAdminPasswordAsync(string password);
}

public class UserService : IUserService
{
    private readonly BillingDbContext _context;

    public UserService(BillingDbContext context)
    {
        _context = context;
    }

    public async Task ToggleUserStatusAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId)
            ?? throw new InvalidOperationException("User not found");

        // Prevent toggling super admin? For now just flip the flag
        user.IsActive = !user.IsActive;
        await _context.SaveChangesAsync();
    }

    public async Task<AppUser?> ValidateUserAsync(string username, string password)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Username == username && u.IsActive);

        if (user == null)
            return null;

        return PasswordHasher.Verify(password, user.PasswordHash) ? user : null;
    }

    public async Task<bool> VerifyAdminPasswordAsync(string password)
    {
        var admins = await _context.Users
            .Where(u => u.Role == UserRole.Admin && u.IsActive)
            .ToListAsync();

        foreach (var admin in admins)
        {
            if (PasswordHasher.Verify(password, admin.PasswordHash))
                return true;
        }

        return false;
    }

    public async Task<AppUser> CreateUserAsync(string username, string password, UserRole role)
    {
        if (await _context.Users.AnyAsync(u => u.Username == username))
            throw new InvalidOperationException("Username already exists");

        var user = new AppUser
        {
            Username = username,
            PasswordHash = PasswordHasher.Hash(password),
            Role = role,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return user;
    }

    public async Task ChangePasswordAsync(int userId, string oldPassword, string newPassword)
    {
        var user = await _context.Users.FindAsync(userId)
            ?? throw new InvalidOperationException("User not found");

        if (!PasswordHasher.Verify(oldPassword, user.PasswordHash))
            throw new InvalidOperationException("Old password is incorrect");

        user.PasswordHash = PasswordHasher.Hash(newPassword);
        await _context.SaveChangesAsync();
    }

    public async Task<List<AppUser>> GetAllAsync()
    {
        return await _context.Users
            .AsNoTracking()
            .OrderBy(u => u.Username)
            .ToListAsync();
    }
}
