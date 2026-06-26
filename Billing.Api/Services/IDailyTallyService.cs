using Billing.Api.Models;

namespace Billing.Api.Services;

public interface IDailyTallyService
{
    Task<DailyTallyResponseDto> SaveAsync(SaveDailyTallyRequest request);
    Task<DailyTallyResponseDto?> GetByDateAsync(DateTime date);
    Task<AnnualTallyReportResponse> GetAnnualReportAsync(int? year, DateTime? from, DateTime? to, string? expenseName);
}
