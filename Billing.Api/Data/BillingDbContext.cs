using Billing.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System;

namespace Billing.Api.Data;

public class BillingDbContext : DbContext
{
    public BillingDbContext(DbContextOptions<BillingDbContext> options)
        : base(options)
    {
    }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<Barcode> Barcodes => Set<Barcode>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Refund> Refunds => Set<Refund>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Distributor> Distributors => Set<Distributor>();
    public DbSet<PurchaseEntry> PurchaseEntry => Set<PurchaseEntry>();
    public DbSet<PurchasePayment> PurchasePayments => Set<PurchasePayment>();
    public DbSet<PurchaseItem> PurchaseItems => Set<PurchaseItem>();
    public DbSet<Salesman> Salesmen => Set<Salesman>();
    public DbSet<Brand> Brands => Set<Brand>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<DistributorOrder> DistributorOrders => Set<DistributorOrder>();
    public DbSet<DistributorOrderItem> DistributorOrderItems => Set<DistributorOrderItem>();
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<SalesVat> SalesVat => Set<SalesVat>();
    public DbSet<PurchaseVat> PurchaseVat => Set<PurchaseVat>();
    public DbSet<GiftProduct> GiftProducts => Set<GiftProduct>();
    public DbSet<LoyaltyRedemption> LoyaltyRedemptions => Set<LoyaltyRedemption>();
    public DbSet<DailyTallyRecord> DailyTallyRecords => Set<DailyTallyRecord>();
    public DbSet<SalesmanCompensationEntry> SalesmanCompensationEntries => Set<SalesmanCompensationEntry>();
    public DbSet<ChequeIssuedEntry> ChequeIssuedEntries => Set<ChequeIssuedEntry>();
    public DbSet<Bank> Banks => Set<Bank>();
    public DbSet<Shop> Shops => Set<Shop>();
    public DbSet<StockTransferEntry> StockTransfers => Set<StockTransferEntry>();
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Barcode configuration
        modelBuilder.Entity<Barcode>()
            .HasOne(b => b.Product)
            .WithMany(p => p.Barcodes)
            .HasForeignKey(b => b.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Barcode>()
            .HasIndex(b => b.BarcodeValue);

        modelBuilder.Entity<Barcode>()
            .Property(b => b.Price)
            .HasPrecision(18, 3);

        modelBuilder.Entity<Barcode>()
            .Property(b => b.MRP)
            .HasPrecision(18, 3);

        modelBuilder.Entity<Barcode>()
            .Property(b => b.CostPrice)
            .HasPrecision(18, 3);

        modelBuilder.Entity<SalesVat>()
            .HasIndex(x => x.InvoiceId)
            .IsUnique();

        modelBuilder.Entity<SalesVat>()
            .HasOne(x => x.Invoice)
            .WithMany()
            .HasForeignKey(x => x.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PurchaseVat>()
            .HasIndex(x => x.PurchaseId)
            .IsUnique();

        modelBuilder.Entity<PurchaseVat>()
            .HasOne(x => x.Purchase)
            .WithMany()
            .HasForeignKey(x => x.PurchaseId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<GiftProduct>()
            .HasIndex(x => x.ProductName)
            .IsUnique();

        modelBuilder.Entity<LoyaltyRedemption>()
            .HasOne(x => x.Invoice)
            .WithMany(x => x.LoyaltyRedemptions)
            .HasForeignKey(x => x.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LoyaltyRedemption>()
            .HasOne(x => x.Customer)
            .WithMany()
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<DailyTallyRecord>()
            .HasIndex(x => x.TallyDate)
            .IsUnique();

        modelBuilder.Entity<DailyTallyRecord>()
            .Property(x => x.PayloadJson)
            .HasColumnType("longtext");

        // Enforce consistent money precision in DB schema
        modelBuilder.Entity<Invoice>()
            .Property(x => x.TotalAmount)
            .HasPrecision(18, 3);

        modelBuilder.Entity<Invoice>()
            .Property(x => x.PaidAmount)
            .HasPrecision(18, 3);

        modelBuilder.Entity<Invoice>()
            .Property(x => x.RefundedAmount)
            .HasPrecision(18, 3);

        modelBuilder.Entity<InvoiceItem>()
            .Property(x => x.UnitPrice)
            .HasPrecision(18, 3);

        modelBuilder.Entity<InvoiceItem>()
            .Property(x => x.MRP)
            .HasPrecision(18, 3);

        modelBuilder.Entity<InvoiceItem>()
            .Property(x => x.GstPercentage)
            .HasPrecision(18, 3);

        modelBuilder.Entity<InvoiceItem>()
            .Property(x => x.LineTotal)
            .HasPrecision(18, 3);

        modelBuilder.Entity<Payment>()
            .Property(x => x.Amount)
            .HasPrecision(18, 3);

        modelBuilder.Entity<Refund>()
            .Property(x => x.Amount)
            .HasPrecision(18, 3);

        modelBuilder.Entity<Product>()
            .Property(x => x.Price)
            .HasPrecision(18, 3);

        modelBuilder.Entity<Product>()
            .Property(x => x.MRP)
            .HasPrecision(18, 3);

        modelBuilder.Entity<Product>()
            .Property(x => x.CostPrice)
            .HasPrecision(18, 3);

        modelBuilder.Entity<Product>()
            .Property(x => x.GstPercentage)
            .HasPrecision(18, 3);

        modelBuilder.Entity<PurchaseEntry>()
            .Property(x => x.SubTotal)
            .HasPrecision(18, 3);

        modelBuilder.Entity<PurchaseEntry>()
            .Property(x => x.GstTotal)
            .HasPrecision(18, 3);

        modelBuilder.Entity<PurchaseEntry>()
            .Property(x => x.TotalAmount)
            .HasPrecision(18, 3);

        modelBuilder.Entity<PurchaseItem>()
            .Property(x => x.PurchaseRate)
            .HasPrecision(18, 3);

        modelBuilder.Entity<PurchaseItem>()
            .Property(x => x.GstPercentage)
            .HasPrecision(18, 3);

        modelBuilder.Entity<PurchaseItem>()
            .Property(x => x.GstAmount)
            .HasPrecision(18, 3);

        modelBuilder.Entity<PurchaseItem>()
            .Property(x => x.LineTotal)
            .HasPrecision(18, 3);

        modelBuilder.Entity<PurchasePayment>()
            .Property(x => x.Amount)
            .HasPrecision(18, 3);

        modelBuilder.Entity<DistributorOrder>()
            .Property(x => x.TotalAmount)
            .HasPrecision(18, 3);

        modelBuilder.Entity<DistributorOrderItem>()
            .Property(x => x.UnitPrice)
            .HasPrecision(18, 3);

        modelBuilder.Entity<DistributorOrderItem>()
            .Property(x => x.TotalPrice)
            .HasPrecision(18, 3);

        modelBuilder.Entity<ChequeIssuedEntry>()
            .Property(x => x.Amount)
            .HasPrecision(18, 3);

        modelBuilder.Entity<SalesmanCompensationEntry>()
            .Property(x => x.Amount)
            .HasPrecision(18, 3);

        modelBuilder.Entity<DailyTallyRecord>()
            .Property(x => x.TotalIncome)
            .HasPrecision(18, 3);

        modelBuilder.Entity<DailyTallyRecord>()
            .Property(x => x.TotalExpenses)
            .HasPrecision(18, 3);

        modelBuilder.Entity<DailyTallyRecord>()
            .Property(x => x.Net)
            .HasPrecision(18, 3);

        modelBuilder.Entity<DailyTallyRecord>()
            .Property(x => x.StatusDifference)
            .HasPrecision(18, 3);

        modelBuilder.Entity<SalesmanCompensationEntry>()
            .HasOne(x => x.Salesman)
            .WithMany()
            .HasForeignKey(x => x.SalesmanId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SalesmanCompensationEntry>()
            .HasIndex(x => new { x.SalesmanId, x.EntryDate, x.EntryType, x.Source });

        modelBuilder.Entity<ChequeIssuedEntry>()
            .HasIndex(x => x.BillDate);

        modelBuilder.Entity<StockTransferEntry>()
            .HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StockTransferEntry>()
            .HasOne(x => x.Shop)
            .WithMany()
            .HasForeignKey(x => x.ShopId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    // Normalize decimal/double precision to 3 decimal places before persisting to database
    private void NormalizeNumericPrecision()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified);

        foreach (var entry in entries)
        {
            foreach (var prop in entry.Properties)
            {
                var type = prop.Metadata.ClrType;
                if (type == typeof(decimal) || type == typeof(decimal?))
                {
                    if (prop.CurrentValue is decimal d)
                    {
                        var rounded = Math.Round(d, 3);
                        prop.CurrentValue = rounded;
                    }
                }

                if (type == typeof(double) || type == typeof(double?))
                {
                    if (prop.CurrentValue is double dv)
                    {
                        var rounded = Math.Round(dv, 3);
                        prop.CurrentValue = rounded;
                    }
                }
            }
        }
    }

    public override int SaveChanges()
    {
        NormalizeNumericPrecision();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        NormalizeNumericPrecision();
        return base.SaveChangesAsync(cancellationToken);
    }

}
