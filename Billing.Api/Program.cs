using Billing.Api.Data;
using Billing.Api.Models;
using Billing.Api.Services;
using Billing.Api.Validators;
using Billing.Api.Security;
using Billing.Api.Routes;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory
});

// ─── Database ───
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("Missing connection string: ConnectionStrings:DefaultConnection");

builder.Services.AddDbContext<BillingDbContext>(options =>
    options.UseMySql(
        connectionString,
        new MySqlServerVersion(new Version(8, 0, 36))
    ));

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
    throw new InvalidOperationException("Missing JWT configuration: Jwt:Key");

var jwtIssuer = builder.Configuration["Jwt:Issuer"];
if (string.IsNullOrWhiteSpace(jwtIssuer))
    throw new InvalidOperationException("Missing JWT configuration: Jwt:Issuer");

var jwtAudience = builder.Configuration["Jwt:Audience"];
if (string.IsNullOrWhiteSpace(jwtAudience))
    throw new InvalidOperationException("Missing JWT configuration: Jwt:Audience");

// ─── Validation ───
builder.Services.AddValidatorsFromAssemblyContaining<CreateProductRequestValidator>();
builder.Services.AddScoped<IValidator<CreatePurchaseRequest>, CreatePurchaseRequestValidator>();
builder.Services.AddScoped<IValidator<CreatePurchasePaymentRequest>, CreatePurchasePaymentRequestValidator>();

// ─── Services ───
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IBarcodeService, BarcodeService>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IRefundService, RefundService>();
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<IDistributorService, DistributorService>();
builder.Services.AddScoped<IPurchaseService, PurchaseService>();
builder.Services.AddScoped<ISalesmanService, SalesmanService>();
builder.Services.AddScoped<IBrandService, BrandService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IGiftService, GiftService>();
builder.Services.AddScoped<IDistributorOrderService, DistributorOrderService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ISalesReportService, SalesReportService>();
builder.Services.AddScoped<IMaintenanceService, MaintenanceService>();
builder.Services.AddScoped<IDailyTallyService, DailyTallyService>();
builder.Services.AddScoped<ISalesmanCompensationService, SalesmanCompensationService>();
builder.Services.AddScoped<IChequeIssuedService, ChequeIssuedService>();
builder.Services.AddScoped<IBankService, BankService>();
builder.Services.AddScoped<IShopService, ShopService>();
builder.Services.AddScoped<IStockTransferService, StockTransferService>();
builder.Services.AddScoped<JwtService>();

// ─── CORS ───
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173", "http://localhost:5683")
            .SetIsOriginAllowed(origin =>
                origin.StartsWith("file://") ||
                origin.StartsWith("http://localhost"))
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// ─── JSON ───
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(
        new System.Text.Json.Serialization.JsonStringEnumConverter()
    );
});

// ─── JWT Authentication ───
builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.TokenValidationParameters = new()
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)
            )
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

Console.WriteLine("ENV: " + Environment.GetEnvironmentVariable("ASPNETCORE_URLS"));

// ─── Middleware Pipeline ───
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

// ─── Database Init & Seed ───
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<BillingDbContext>();
    context.Database.Migrate();
    DbSeeder.Seed(context);
}

// ─── Routes ───
app.MapAuthRoutes();
app.MapProductRoutes();
app.MapBarcodeRoutes();
app.MapInvoiceRoutes();
app.MapPaymentRoutes();
app.MapCustomerRoutes();
app.MapPurchaseRoutes();
app.MapMasterRoutes();
app.MapReportRoutes();
app.MapMaintenanceRoutes();
app.MapDailyTallyRoutes();
app.MapChequeIssuedRoutes();
app.MapPrintRoutes();
app.MapShopRoutes();

app.Run();