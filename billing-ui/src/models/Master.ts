// models/Master.ts

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

export interface CreateBrandRequest {
    brandCode: string;
    brandName: string;
    isActive: boolean;
}

export interface UpdateBrandRequest {
    brandName: string;
    isActive: boolean;
}

export interface CreateCategoryRequest {
    categoryCode: string;
    categoryName: string;
    isActive: boolean;
}

export interface UpdateCategoryRequest {
    categoryName: string;
    isActive: boolean;
}