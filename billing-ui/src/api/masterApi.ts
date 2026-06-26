// api/masterApi.ts
import { api } from "./axios";

export interface BrandDto {
    id: number;
    brandCode: string;
    brandName: string;
    isActive: boolean;
}

export interface CategoryDto {
    id: number;
    categoryCode: string;
    categoryName: string;
    isActive: boolean;
}

export const getAllBrands = async (): Promise<BrandDto[]> => {
    const response = await api.get<BrandDto[]>("/brands");
    return response.data;
};

export const getAllCategories = async (): Promise<CategoryDto[]> => {
    const response = await api.get<CategoryDto[]>("/categories");
    return response.data;
};

export const getActiveBrands = async (): Promise<BrandDto[]> => {
    const response = await api.get<BrandDto[]>("/brands/active");
    return response.data;
};

export const getActiveCategories = async (): Promise<CategoryDto[]> => {
    const response = await api.get<CategoryDto[]>("/categories/active");
    return response.data;
};