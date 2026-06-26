namespace Billing.Api.Models;

public record LoginRequest(string Username, string Password);

public record LoginResponse(
    int Id,
    string Username,
    string Role,
    string Token
);

public record ChangePasswordRequest(
    string OldPassword,
    string NewPassword
);
