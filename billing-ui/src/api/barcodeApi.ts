import { api } from "./axios";
import type { BarcodeMasterDto, CreateBarcodeRequest, UpdateBarcodeRequest } from "../models/Barcode";
import type { ProductDto } from "../models/Product";

export const getAllBarcodes = async (): Promise<BarcodeMasterDto[]> => {
    try {
        const response = await api.get<BarcodeMasterDto[]>("/barcodes");
        return response.data || [];
    } catch (error: any) {
        console.error("getAllBarcodes full error:", {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
            config: error.config
        });
        // Return empty array if error (table might be empty)
        return [];
    }
};

export const getBarcodesByProductId = async (productId: number): Promise<BarcodeMasterDto[]> => {
    try {
        const response = await api.get<BarcodeMasterDto[]>(`/barcodes/product/${productId}`);
        return response.data || [];
    } catch (error: any) {
        console.error("getBarcodesByProductId error:", {
            productId,
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        // Return empty array if error
        return [];
    }
};

export const getByBarcodeValue = async (barcodeValue: string): Promise<BarcodeMasterDto | null> => {
    try {
        const response = await api.get<BarcodeMasterDto>(`/barcodes/value/${barcodeValue}`);
        return response.data;
    } catch {
        return null;
    }
};

export const getProductsByBarcodeValue = async (barcodeValue: string): Promise<ProductDto[]> => {
    const response = await api.get<ProductDto[]>(`/barcodes/products/${barcodeValue}`);
    return response.data;
};

export const createBarcode = async (data: CreateBarcodeRequest): Promise<BarcodeMasterDto> => {
    const res = await api.post<BarcodeMasterDto>("/barcodes", data);
    return res.data;
};

export const updateBarcode = async (id: number, data: UpdateBarcodeRequest): Promise<BarcodeMasterDto> => {
    const res = await api.put<BarcodeMasterDto>(`/barcodes/${id}`, data);
    return res.data;
};

export const deleteBarcode = async (id: number): Promise<void> => {
    await api.delete(`/barcodes/${id}`);
};
