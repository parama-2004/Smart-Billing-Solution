export interface CreateInvoiceItemRequest {
    productId: number;
    quantity: number;
    rate: number;
    mrp: number;
    gstPercentage: number;
}

export interface CreateInvoiceRequest {
    customerId?: number;
    salesmanId?: number;
    items: CreateInvoiceItemRequest[];
    status?: string;
    redemption?: CreateLoyaltyRedemptionRequest;
}

export interface CreateLoyaltyRedemptionRequest {
    type: "Discount" | "Gift";
    points: number;
    giftProductName?: string;
}

export interface LoyaltyRedemptionDto {
    id: number;
    invoiceId: number;
    customerId?: number;
    customerName: string;
    customerCode: string;
    type: "Discount" | "Gift";
    pointsUsed: number;
    discountAmount: number;
    giftProductName?: string;
    redeemedOn: string;
}

export interface UpdateInvoiceRequest {
    customerId?: number;
    salesmanId?: number;
    items: CreateInvoiceItemRequest[];
    status?: string;
    redemption?: CreateLoyaltyRedemptionRequest;

}

export interface InvoiceItemDto {
    productId: number;
    productName: string;
    hsnCode: string;
    quantity: number;
    mrp: number;
    gstPercentage: number;
    unitPrice: number;
    lineTotal: number;
}

export interface InvoiceResponseDto {
    id: number;  // Make it required instead of optional
    invoiceNumber: string;
    customerId?: number;
    customerName?: string;
    date: string;
    totalAmount: number;
    paidAmount: number;
    balance: number;
    status: string;
    paymentMode?: "Cash" | "UPI" | "Card" | "Pluxee" | "Cash+UPI" | "Cash+Card";
    salesmanId?: number;
    items: InvoiceItemDto[];
    cashReceived?: number;
    changeAmount?: number;
    loyaltyPointsRedeemed?: number;
    loyaltyDiscountAmount?: number;
    redeemedItems?: LoyaltyRedemptionDto[];
}

export interface RefundData {
    reason: string;
    method: string;
    amount: number;
}