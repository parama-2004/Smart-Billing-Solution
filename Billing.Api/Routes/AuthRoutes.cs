using Billing.Api.Models;
using Billing.Api.Services;
using Billing.Api.Security;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Billing.Api.Routes;

public static class AuthRoutes
{
    public static void MapAuthRoutes(this WebApplication app)
    {
        app.MapGet("/db-status", async (Billing.Api.Data.BillingDbContext db) =>
        {
            try
            {
                var canConnect = await db.Database.CanConnectAsync();
                return Results.Ok(new { status = canConnect ? "connected" : "disconnected" });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { status = "error", message = ex.Message });
            }
        });

        app.MapPost("/auth/login", async (
            LoginRequest request,
            JwtService jwtService,
            IUserService userService,
            ILoggerFactory loggerFactory
        ) =>
        {
            try
            {
                Console.WriteLine("Login attempt started");

                var user = await userService.ValidateUserAsync(request.Username, request.Password);

                Console.WriteLine("User fetched");

                if (user == null)
                    return Results.Unauthorized();

                var token = jwtService.Generate(user);
                return Results.Ok(new { token, role = user.Role, username = user.Username, id = user.Id });
            }
            catch (Exception ex)
            {
                Console.WriteLine("🔥 LOGIN ERROR:");
                Console.WriteLine(ex.ToString());

                var logger = loggerFactory.CreateLogger("AuthRoutes");
                logger.LogError(ex, "Login failed for username '{Username}'", request.Username);
                return Results.Problem(title: "Login failed", detail: ex.Message, statusCode: StatusCodes.Status500InternalServerError);
            }
        });

        app.MapPost("/auth/verify-admin", async (
            VerifyAdminRequest request,
            IUserService userService
        ) =>
        {
            try
            {
                var isValid = await userService.VerifyAdminPasswordAsync(request.Password);
                if (isValid)
                    return Results.Ok(new { message = "Admin verified" });
                
                return Results.Unauthorized();
            }
            catch (Exception ex)
            {
                return Results.Problem(title: "Verification failed", detail: ex.Message, statusCode: StatusCodes.Status500InternalServerError);
            }
        });

        app.MapPost("/auth/change-password", async (
            ChangePasswordRequest request,
            IUserService userService,
            HttpContext httpContext
        ) =>
        {
            try
            {
                var userIdClaim =
                    httpContext.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                    ?? httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? httpContext.User.FindFirst("sub")?.Value;
                if (userIdClaim == null)
                    return Results.Unauthorized();

                await userService.ChangePasswordAsync(
                    int.Parse(userIdClaim),
                    request.OldPassword,
                    request.NewPassword
                );
                return Results.Ok(new { message = "Password changed successfully" });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        }).RequireAuthorization();

        app.MapGet("/users", async (IUserService userService) =>
        {
            var users = await userService.GetAllAsync();
            return Results.Ok(users);
        });

        app.MapPut("/users/{id:int}/status", async (int id, HttpContext httpContext, IUserService userService) =>
        {
            // require admin role
            var roleClaim = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value
                            ?? httpContext.User.FindFirst("role")?.Value;
            if (string.IsNullOrWhiteSpace(roleClaim) || !string.Equals(roleClaim, "Admin", StringComparison.OrdinalIgnoreCase))
                return Results.Forbid();

            try
            {
                await userService.ToggleUserStatusAsync(id);
                return Results.Ok(new { message = "Status toggled" });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        }).RequireAuthorization();

        app.MapPost("/users", async (
            CreateUserRequest request,
            IUserService userService
        ) =>
        {
            try
            {
                var user = await userService.CreateUserAsync(
                    request.Username,
                    request.Password,
                    request.Role
                );
                return Results.Created($"/users/{user.Id}", new
                {
                    user.Id,
                    user.Username,
                    user.Role,
                    user.IsActive,
                    user.CreatedAt
                });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });
    }
}

public record CreateUserRequest(string Username, string Password, UserRole Role);
public record VerifyAdminRequest(string Password);
