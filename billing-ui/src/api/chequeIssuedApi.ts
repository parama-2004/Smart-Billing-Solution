import { api } from "./axios";
import type { ChequeIssuedResponse, CreateChequeIssuedRequest } from "../models/ChequeIssued";

export const createChequeIssued = async (request: CreateChequeIssuedRequest): Promise<ChequeIssuedResponse> => {
    const res = await api.post<ChequeIssuedResponse>("/cheque-issued", request);
    return res.data;
};

export const updateChequeIssued = async (id: number, request: CreateChequeIssuedRequest): Promise<ChequeIssuedResponse> => {
    const res = await api.put<ChequeIssuedResponse>(`/cheque-issued/${id}`, request);
    return res.data;
};

export const getChequeIssuedReport = async (fromDate?: string, toDate?: string): Promise<ChequeIssuedResponse[]> => {
    const res = await api.get<ChequeIssuedResponse[]>("/cheque-issued", {
        params: { fromDate, toDate }
    });
    return res.data;
};
