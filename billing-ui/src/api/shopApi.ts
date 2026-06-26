import { api } from "./axios";
import type { ShopDto, CreateShopRequest, UpdateShopRequest, StockTransferDto, CreateStockTransferRequest } from "../models/Shop";

export interface ShopSettings {
    name: string;
    address: string;
    state: string;
    phone: string;
    gstin: string;
    whatsappNumber: string;
}

/** Module-level cache — fetched once per session */
let _cached: ShopSettings | null = null;

export async function getShopSettings(): Promise<ShopSettings> {
    if (_cached) return _cached;
    try {
        const res = await api.get<ShopSettings>("/shop-settings");
        _cached = res.data;
        return _cached;
    } catch {
        // If the API call fails, return the hardcoded fallback silently
        return defaultShopSettings;
    }
}

/** Call after appsettings.json changes and API restarts */
export function resetShopCache() {
    _cached = null;
}

/** Fallback used before the API responds or if it fails */
export const defaultShopSettings: ShopSettings = {
    name: "Smart Super Market",
    address: "58,59 Main Bazaar Block - 19",
    state: "Neyveli TS PIN-607803",
    phone: "8903825381/8220919445",
    gstin: "GST33ABXFS8086J1Z7",
    whatsappNumber: "8903825381"
};

// ─── Shop Master ───
export async function getAllShops(): Promise<ShopDto[]> {
    const res = await api.get<ShopDto[]>("/shops");
    return res.data;
}

export async function createShop(data: CreateShopRequest): Promise<ShopDto> {
    const res = await api.post<ShopDto>("/shops", data);
    return res.data;
}

export async function updateShop(id: number, data: UpdateShopRequest): Promise<ShopDto> {
    const res = await api.put<ShopDto>(`/shops/${id}`, data);
    return res.data;
}

export async function deleteShop(id: number): Promise<void> {
    await api.delete(`/shops/${id}`);
}

// ─── Stock Transfers ───
export async function getAllStockTransfers(): Promise<StockTransferDto[]> {
    const res = await api.get<StockTransferDto[]>("/stock-transfers");
    return res.data;
}

export async function createStockTransfer(data: CreateStockTransferRequest): Promise<StockTransferDto> {
    const res = await api.post<StockTransferDto>("/stock-transfers", data);
    return res.data;
}
