namespace Billing.Api.Models;

public class ChequeIssuedEntry
{
    public int Id { get; set; }
    public string VendorName { get; set; } = null!;
    public DateTime BillDate { get; set; }
    public string BillNo { get; set; } = null!;
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = null!; // cheque | cash | credit | dd
    public string? ChequeNumber { get; set; }
    public DateTime? ChequeDate { get; set; }
    public string? BankName { get; set; }
    public bool StockReturn { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
}

public record CreateChequeIssuedRequest(
    string VendorName,
    DateTime BillDate,
    string BillNo,
    decimal Amount,
    string PaymentMethod,
    string? ChequeNumber,
    DateTime? ChequeDate,
    string? BankName,
    bool StockReturn,
    string? Remarks
);

public record ChequeIssuedResponse(
    int Id,
    string VendorName,
    DateTime BillDate,
    string BillNo,
    decimal Amount,
    string PaymentMethod,
    string? ChequeNumber,
    DateTime? ChequeDate,
    string? BankName,
    bool StockReturn,
    string? Remarks,
    DateTime CreatedAt
)
{
    // Backward compatibility constructor for older migrations
    public ChequeIssuedResponse(
        int id,
        string vendorName,
        DateTime billDate,
        string billNo,
        decimal amount,
        string paymentMethod,
        string? chequeNumber,
        DateTime? chequeDate,
        string? bankName,
        bool stockReturn,
        DateTime createdAt
    ) : this(id, vendorName, billDate, billNo, amount, paymentMethod, chequeNumber, chequeDate, bankName, stockReturn, null, createdAt)
    {
    }
}
