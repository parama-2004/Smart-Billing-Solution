import { api } from "./axios";
import type { SalesmanCompensationDetailDto, SalesmanCompensationSummaryDto, SalesmanDto } from "../models/Salesman";

export const getAllSalesmen = async (): Promise<SalesmanDto[]> => {
    const res = await api.get<SalesmanDto[]>("/salesmen");
    return res.data;
};

export const getSalesmanCompensationSummary = async (): Promise<SalesmanCompensationSummaryDto[]> => {
    const res = await api.get<SalesmanCompensationSummaryDto[]>("/salesmen/compensation-summary");
    return res.data;
};

export const getSalesmanCompensationDetails = async (salesmanId: number): Promise<SalesmanCompensationDetailDto[]> => {
    const res = await api.get<SalesmanCompensationDetailDto[]>(`/salesmen/${salesmanId}/compensation`);
    return res.data;
};
