export type OrderPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type OrderStatus =
    | 'Draft'
    | 'Pending'
    | 'Confirmed'
    | 'Received'
    | 'Shipped'
    | 'Delivered'
    | 'Cancelled';

export interface DistributorOrderItemRequest {
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    barCode?: string;
    hsnCode?: string;
}

export interface CreateDistributorOrderRequest {
    distributorId: number;
    distributorCode: string;
    distributorName: string;
    contactPerson: string;
    orderDate: string;
    expectedDeliveryDate: string;
    items: DistributorOrderItemRequest[];
    notes?: string;
    priority: OrderPriority;
    totalAmount: number;
    status: OrderStatus;
}

export interface DistributorOrderItemResponse {
    id: number;
    orderId: number;
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    barCode?: string;
    hsnCode?: string;
}

export interface DistributorOrderResponse {
    id: number;
    distributorId: number;
    distributorCode: string;
    distributorName: string;
    distributorPhone: string;
    distributorAddress: string;
    contactPerson: string;
    orderDate: string;
    expectedDeliveryDate: string;
    items: DistributorOrderItemResponse[];
    notes?: string;
    priority: OrderPriority;
    totalAmount: number;
    status: OrderStatus;
    createdAt: string;
    updatedAt: string;
}
