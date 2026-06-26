import { api } from "./axios";
import type {
    CreateInvoiceRequest,
    UpdateInvoiceRequest,
    InvoiceResponseDto
} from "../models/Invoice";

/* -------------------------------------------------------
   CREATE INVOICE
------------------------------------------------------- */
export const createInvoice = async (
    request: CreateInvoiceRequest
): Promise<InvoiceResponseDto> => {
    const res = await api.post<InvoiceResponseDto>("/invoices", request);
    return res.data;
};

/* -------------------------------------------------------
   UPDATE INVOICE
   (PUT /invoices/{id})
------------------------------------------------------- */
export const updateInvoice = async (
    invoiceId: number,
    request: UpdateInvoiceRequest
): Promise<InvoiceResponseDto> => {
    const res = await api.put<InvoiceResponseDto>(
        `/invoices/${invoiceId}`,
        request
    );
    return res.data;
};

export const adminUpdateInvoice = async (
    invoiceId: number,
    request: UpdateInvoiceRequest
): Promise<InvoiceResponseDto> => {
    const res = await api.put<InvoiceResponseDto>(
        `/invoices/${invoiceId}/admin`,
        request
    );
    return res.data;
};

/* -------------------------------------------------------
   GET ALL INVOICES
------------------------------------------------------- */
export const getAllInvoices = async (): Promise<InvoiceResponseDto[]> => {
    const res = await api.get<InvoiceResponseDto[]>("/invoices");
    return res.data;
};

/* -------------------------------------------------------
   GET REPRINT INVOICES
------------------------------------------------------- */
export const getReprintInvoices = async (limit?: number, search?: string): Promise<InvoiceResponseDto[]> => {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (search) params.append("search", search);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get<InvoiceResponseDto[]>(`/invoices/reprint${queryString}`);
    return res.data;
};

/* -------------------------------------------------------
   GET INVOICE BY NUMBER
------------------------------------------------------- */
export const getInvoiceByNumber = async (
    invoiceNumber: string
): Promise<InvoiceResponseDto> => {
    const res = await api.get<InvoiceResponseDto>(
        `/invoices/by-number/${invoiceNumber}`
    );
    return res.data;
};

/* -------------------------------------------------------
   GET INVOICES BY CUSTOMER
------------------------------------------------------- */
export const getInvoicesByCustomer = async (
    customerId: number
): Promise<InvoiceResponseDto[]> => {
    const res = await api.get<InvoiceResponseDto[]>(
        `/invoices/by-customer/${customerId}`
    );
    return res.data;
};

/* -------------------------------------------------------
   GET INVOICES BY SALESMAN
------------------------------------------------------- */
export const getInvoicesBySalesman = async (
    salesmanId: number
): Promise<InvoiceResponseDto[]> => {
    const res = await api.get<InvoiceResponseDto[]>(
        `/invoices/by-salesman/${salesmanId}`
    );
    return res.data;
};

/* -------------------------------------------------------
   GET HOLD / UNPAID INVOICES
------------------------------------------------------- */
export const getHoldInvoices = async (): Promise<InvoiceResponseDto[]> => {
    const res = await api.get<InvoiceResponseDto[]>("/invoices/hold");
    return res.data;
};

/* -------------------------------------------------------
   GET TODAY'S INVOICES
------------------------------------------------------- */
export const getTodayInvoices = async (): Promise<InvoiceResponseDto[]> => {
    const res = await api.get<InvoiceResponseDto[]>("/invoices/today");
    return res.data;
};

/* -------------------------------------------------------
   GET INVOICES BY DATE RANGE
------------------------------------------------------- */
export const getInvoicesByDateRange = async (
    fromDate: string,
    toDate: string
): Promise<InvoiceResponseDto[]> => {
    const res = await api.get<InvoiceResponseDto[]>(
        `/invoices/by-date/${fromDate}/${toDate}`
    );
    return res.data;
};

/* -------------------------------------------------------
   GET INVOICE SUMMARY
------------------------------------------------------- */
export const getInvoiceSummary = async () => {
    const res = await api.get("/invoices/summary");
    return res.data;
};

/* -------------------------------------------------------
   CANCEL / DELETE INVOICE
------------------------------------------------------- */
export const cancelInvoice = async (
    invoiceId: number,
    reason: string
): Promise<InvoiceResponseDto> => {
    const res = await api.post<InvoiceResponseDto>(
        "/invoices/cancel",
        { invoiceId, reason }
    );
    return res.data;
};

/* -------------------------------------------------------
   DELETE (SOFT DELETE VIA STATUS)
------------------------------------------------------- */
export const deleteInvoice = async (
    invoiceId: number
) => {
    const res = await api.delete(`/invoices/${invoiceId}`);
    return res.data;
};
