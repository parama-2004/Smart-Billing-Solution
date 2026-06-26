using Billing.Api.Models;

namespace Billing.Api.Services;

public interface ISalesmanCompensationService
{
    Task SyncDailyTallyEntriesAsync(
        DateTime date,
        List<SalesmanCompensationEntryRequest> salaries,
        List<SalesmanCompensationEntryRequest> advances);

    Task<List<SalesmanCompensationSummaryDto>> GetSummaryAsync();
    Task<List<SalesmanCompensationDetailDto>> GetDetailsBySalesmanAsync(int salesmanId);
}
