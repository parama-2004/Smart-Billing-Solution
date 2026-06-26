export type PaymentMethod = "cheque" | "cash" | "credit" | "dd";

export interface CreateChequeIssuedRequest {
    vendorName: string;
    billDate: string;
    billNo: string;
    amount: number;
    paymentMethod: PaymentMethod;
    chequeNumber?: string;
    chequeDate?: string;
    bankName?: string;
    stockReturn: boolean;
    remarks?: string;
}

export interface ChequeIssuedResponse {
    id: number;
    vendorName: string;
    billDate: string;
    billNo: string;
    amount: number;
    paymentMethod: PaymentMethod;
    chequeNumber?: string;
    chequeDate?: string;
    bankName?: string;
    stockReturn: boolean;
    remarks?: string;
    createdAt: string;
}
