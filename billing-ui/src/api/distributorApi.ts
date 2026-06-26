import { api } from "./axios";
import type { DistributorDto } from "../models/Distributor";

export const getAllDistributorsCached = async (): Promise<DistributorDto[]> => {
    const res = await api.get<DistributorDto[]>("/distributors");
    return res.data;
};

export const createDistributor = async (data: {
    name: string;
    address: string;
    mobile?: string;
    telephone?: string;
    email?: string;
    gstNumber?: string;
    openingBalance: number;
    dateOfJoin: string;
}) => {
    const res = await api.post("/distributors", data);
    return res.data;
};
export const updateDistributor = async (id: number, data: {
    name: string;
    address: string;
    mobile?: string;
    telephone?: string;
    email?: string;
    gstNumber?: string;
    openingBalance: number;
    dateOfJoin: string;
}) => {
    const res = await api.put(`/distributors/${id}`, data);
    return res.data;
};
