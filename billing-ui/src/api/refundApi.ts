import { api } from "./axios";
import type { InvoiceResponseDto } from "../models/Invoice";

export interface CreateRefundRequest {
    invoiceId: number;
    amount: number;
    reason: string;
    method: string;
}

export interface RefundResponse {
    id: number;
    amount: number;
    reason: string;
    method: string;
    refundedOn: string;
}

/* -------------------------------------------------------
   CREATE REFUND
------------------------------------------------------- */
export const createRefund = async (
    request: CreateRefundRequest
): Promise<InvoiceResponseDto> => {
    const res = await api.post<InvoiceResponseDto>("/refunds", request);
    return res.data;
};

/* -------------------------------------------------------
   GET REFUNDS FOR INVOICE
------------------------------------------------------- */
export const getRefundsForInvoice = async (
    invoiceId: number
): Promise<RefundResponse[]> => {
    const res = await api.get<RefundResponse[]>(
        `/invoices/${invoiceId}/refunds`
    );
    return res.data;
};