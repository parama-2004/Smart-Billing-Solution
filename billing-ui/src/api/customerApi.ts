import type { CustomerDto } from "../models/Customer";
import { api } from "./axios";

export const getCustomers = async (): Promise<CustomerDto[]> => {
    const response = await api.get<CustomerDto[]>("/customers");
    return response.data;
};


export const createCustomer = async (payload: {
    name: string;
    mobile: string;
    address: string;
    telephone?: string;
    email?: string;
    openingBalance: number;
}): Promise<CustomerDto> => {
    const res = await api.post<CustomerDto>("/customers", payload);
    return res.data;
};

export const updateCustomer = async (
    id: number,
    payload: Partial<CustomerDto>
): Promise<CustomerDto> => {
    const res = await api.put<CustomerDto>(`/customers/${id}`, payload);
    return res.data;
};

// Add this function to get customer by ID
export const getCustomerById = async (id: number): Promise<CustomerDto> => {
    const response = await api.get(`/customers/${id}/ledger`);

    // Adjust this mapping ONLY if your ledger response shape differs
    return {
        id: response.data.customerId,
        customerCode: response.data.customerCode ?? "",
        name: response.data.customerName ?? response.data.name ?? "",
        mobile: response.data.mobile ?? "",
        address: response.data.address ?? "",
        openingBalance: response.data.openingBalance ?? 0,
        closingBalance: response.data.closingBalance ?? 0,
        purchaseAmount: response.data.purchaseAmount ?? 0,
        returnedAmount: response.data.returnedAmount ?? 0,
        loyaltyPoints: response.data.loyaltyPoints ?? 0
    };
};

export const getCustomerByIdC = async (id: number): Promise<CustomerDto> => {
    const response = await api.get(`/customers/${id}/cledger`);

    // Adjust this mapping ONLY if your ledger response shape differs
    return {
        id: response.data.customerId,
        customerCode: response.data.customerCode ?? "",
        name: response.data.customerName ?? response.data.name ?? "",
        mobile: response.data.mobile ?? "",
        address: response.data.address ?? "",
        openingBalance: response.data.openingBalance ?? 0,
        closingBalance: response.data.closingBalance ?? 0,
        purchaseAmount: response.data.purchaseAmount ?? 0,
        returnedAmount: response.data.returnedAmount ?? 0,
        loyaltyPoints: response.data.loyaltyPoints ?? 0
    };
};