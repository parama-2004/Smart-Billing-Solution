import { api } from "./axios";
import type { InvoiceResponseDto } from "../models/Invoice";

export interface CreatePaymentRequest {
    invoiceId: number;
    amount: number;
    method: string;
}

export interface PaymentDto {
    id: number;
    amount: number;
    method: string;
    paidOn: string;
}

export const makePayment = async (
    request: CreatePaymentRequest
): Promise<InvoiceResponseDto> => {
    const response = await api.post<InvoiceResponseDto>(
        "/payments",
        request
    );
    return response.data;
};

export const getPaymentsForInvoice = async (
    invoiceId: number
): Promise<PaymentDto[]> => {
    const response = await api.get<PaymentDto[]>(
        `/invoices/${invoiceId}/payments`
    );
    return response.data;
};
