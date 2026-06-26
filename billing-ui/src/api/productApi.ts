import { api } from "./axios";
import type { ProductDto } from "../models/Product";

export const getProducts = async (): Promise<ProductDto[]> => {
    const response = await api.get<ProductDto[]>("/products");
    return response.data;
};

export const getProductById = async (id: number): Promise<ProductDto> => {
    const response = await api.get<ProductDto[]>("/products");

    const product = response.data.find(p => p.id === id);

    if (!product) {
        throw new Error("Product not found");
    }

    return product;
};

// ─── Manual cache REMOVED ─────────────────────────────────────────────────────
// Product data is now managed by TanStack Query via the useProducts() hook
// (src/hooks/useProducts.ts).  The shims below keep every existing import
// site compiling without any changes to those files.
//
// New code: import { useProducts, useInvalidateProducts } from "../../hooks/useProducts"
// Legacy code continues to call getAllProductsCached() — it now just hits the
// API directly (no JS-heap accumulation, no stale-data risk).

/** @deprecated Use the useProducts() hook instead. */
export const resetProductCache = (): void => {
    // No-op: TanStack Query handles invalidation via useInvalidateProducts().
    // Left here so existing call sites in ProductMaster / BarcodeMaster compile.
};

/** @deprecated Use the useProducts() hook for reads inside React components.
 *  Kept for non-hook call sites (e.g. OrderMaster, PurchaseEntry, Reports). */
export const getAllProductsCached = (): Promise<ProductDto[]> => getProducts();

export type CreateProductRequest = {
    name: string;
    price: number;
    hsnCode?: string | null;
    mrp: number;
    costPrice: number;
    gstPercentage: number;
    stock: number;
    distributorId: number;
    brandCode?: string | null;
    categoryCode?: string | null;
};


export const createProduct = async (
    data: CreateProductRequest
): Promise<ProductDto> => {
    const res = await api.post<ProductDto>("/products", data);
    return res.data;
};

export const updateProduct = async (
    id: number,
    data: CreateProductRequest
): Promise<ProductDto> => {
    const res = await api.put<ProductDto>(`/products/${id}`, data);
    return res.data;
};
