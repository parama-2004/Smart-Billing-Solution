export interface CreatePurchaseRequest {
    date: string;
    distributorId: number;
    distributorName: string;
    invoiceNo: string;
    invoiceDate: string;
    type: PurchaseType;
    items: CreatePurchaseItemRequest[];
    discount: number;
    otherCharges: number;
    roundOff: number;
    totalAmount: number;
}

export interface CreatePurchaseItemRequest {
    productId: number;
    productName: string;
    hsnCode?: string;
    brandCode?: string;
    categoryCode?: string;
    quantity: number;
    unitPrice: number;
    purchaseRate: number;
    mrp: number;
    gstPercentage: number;
    discountType: 'percentage' | 'amount'; // 'percentage' or 'amount'
    discountValue: number; // either percentage or fixed amount
    discountAmount: number; // calculated discount amount
}

export interface CreatePurchasePaymentRequest {
    mode: PaymentMode;
    chequeNo?: string;
    chequeDate?: string;
    bankName?: string;
    paymentDate: string;
    amount: number;
    distributorId: number;
    remarks?: string;
}

export interface PurchaseResponse {
    id: number;
    date: string;
    distributorId: number;
    distributorName: string;
    invoiceNo: string;
    invoiceDate: string;
    type: PurchaseType;
    subTotal: number;
    gstTotal: number;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    status: PaymentStatus;
    items: PurchaseItemResponse[];
    payments: PurchasePaymentResponse[];
    discount?: number;
    otherCharges?: number;
    roundOff?: number;
}

export interface PurchaseItemResponse {
    productId: number;
    productName: string;
    hsnCode?: string;
    brandCode?: string;
    categoryCode?: string;
    quantity: number;
    unitPrice: number;
    purchaseRate: number;
    mrp: number;
    gstPercentage: number;
    gstAmount: number;
    lineTotal: number;
    discountType: 'percentage' | 'amount'; // 'percentage' or 'amount'
    discountValue: number; // either percentage or fixed amount
    discountAmount: number; // calculated discount amount
}

export interface PurchasePaymentResponse {
    id: number;
    mode: PaymentMode;
    chequeNo?: string;
    chequeDate?: string;
    bankName?: string;
    paymentDate: string;
    amount: number;
    remarks?: string;
    status: PaymentStatus;
}

export type PurchaseType = "Local" | "Interstate" | "Composite";
export type PaymentMode = "Cash" | "Cheque" | "DD" | "Credit";
export type PaymentStatus = "Pending" | "Partial" | "Paid" | "Cancelled" | "Rejected";