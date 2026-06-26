using System;
using System.Collections.Generic;

namespace Billing.Api.Models;

public enum DistributorOrderStatus
{
	Draft,
	Pending,
	Confirmed,
	Processing,
	Received,
	Shipped,
	Delivered,
	Cancelled
}


public class DistributorOrder
{
	public int Id { get; set; }

	// Distributor info snapshot
	public int DistributorId { get; set; }
	public string DistributorCode { get; set; } = null!;
	public string DistributorName { get; set; } = null!;
	public string DistributorPhone { get; set; } = null!;
	public string DistributorAddress { get; set; } = null!;

	public string ContactPerson { get; set; } = null!;

	public DateTime OrderDate { get; set; }
	public DateTime ExpectedDeliveryDate { get; set; }

	public string? Notes { get; set; }

	public string Priority { get; set; } = "Medium";

	public decimal TotalAmount { get; set; }

	public DistributorOrderStatus Status { get; set; } = DistributorOrderStatus.Draft;

	public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
	public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

	public List<DistributorOrderItem> Items { get; set; } = new();
}


public class DistributorOrderItem
{
	public int Id { get; set; }

	public int DistributorOrderId { get; set; }

	public int ProductId { get; set; }
	public string ProductName { get; set; } = null!;

	public int Quantity { get; set; }

	// EXACT match with frontend
	public decimal UnitPrice { get; set; }
	public decimal TotalPrice { get; set; }

	public string? BarCode { get; set; }
	public string? HsnCode { get; set; }
}

public record DistributorOrderItemRequest(
	int ProductId,
	string ProductName,
	int Quantity,
	decimal UnitPrice,
	decimal TotalPrice,
	string? BarCode,
	string? HsnCode
);

public record CreateDistributorOrderRequest(
	int DistributorId,
	string DistributorCode,
	string DistributorName,
	string ContactPerson,
	DateTime OrderDate,
	DateTime ExpectedDeliveryDate,
	List<DistributorOrderItemRequest> Items,
	string? Notes,
	string Priority,
	decimal TotalAmount,
	string Status
);



public record PurchaseOrderItemResponse(
	int ProductId,
	string ProductName,
	int Quantity,
	decimal CostPrice,
	decimal GstPercentage,
	decimal GstAmount,
	decimal LineTotal
);

public record PurchaseOrderResponse(
	int Id,
	string OrderNumber,
	DateTime OrderDate,
	int DistributorId,
	string DistributorName,
	decimal SubTotal,
	decimal GstTotal,
	decimal TotalAmount,
	string Status,
	List<PurchaseOrderItemResponse> Items
);

public record UpdateDistributorOrderStatusRequest(
	DistributorOrderStatus Status
);
