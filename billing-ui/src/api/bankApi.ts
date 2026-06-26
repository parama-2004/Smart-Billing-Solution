import { api } from "./axios";
import type { Bank } from "../models/Bank";

export const getBanks = async (): Promise<Bank[]> => {
    const res = await api.get("/banks");
    return res.data;
};

export const createBank = async (name: string): Promise<Bank> => {
    const res = await api.post("/banks", { name });
    return res.data;
};

export const updateBank = async (id: number, name: string): Promise<Bank> => {
    const res = await api.put(`/banks/${id}`, { name });
    return res.data;
};

export const deleteBank = async (id: number): Promise<void> => {
    await api.delete(`/banks/${id}`);
};
