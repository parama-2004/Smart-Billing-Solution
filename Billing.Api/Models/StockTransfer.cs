using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Billing.Api.Models;

public enum StockTransferType
{
    In,
    Out
}

public class StockTransferEntry
{
    [Key]
    public int Id { get; set; }

    public DateTime TransferDate { get; set; }

    public int ProductId { get; set; }
    
    [ForeignKey(nameof(ProductId))]
    public Product Product { get; set; } = null!;

    public int Quantity { get; set; }

    public StockTransferType TransferType { get; set; }

    public int ShopId { get; set; }
    
    [ForeignKey(nameof(ShopId))]
    public Shop Shop { get; set; } = null!;
}

public class CreateStockTransferRequest
{
    public DateTime TransferDate { get; set; }
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    [Required]
    public string TransferType { get; set; } = string.Empty; // "In" or "Out"
    public int ShopId { get; set; }
}

public class StockTransferResponse
{
    public int Id { get; set; }
    public DateTime TransferDate { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? ProductBarcode { get; set; }
    public int Quantity { get; set; }
    public string TransferType { get; set; } = string.Empty;
    public int ShopId { get; set; }
    public string ShopName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal Amount { get; set; }
}
