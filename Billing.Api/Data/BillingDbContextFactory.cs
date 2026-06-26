using Billing.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Billing.Api.Data;

public class BillingDbContextFactory
    : IDesignTimeDbContextFactory<BillingDbContext>
{
    public BillingDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<BillingDbContext>();

        var connectionString = "Server=127.0.0.1;Port=3306;User=root;Password=Parama@1195#;Database=billing_suite;";
        optionsBuilder.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString));

        return new BillingDbContext(optionsBuilder.Options);
    }
}
