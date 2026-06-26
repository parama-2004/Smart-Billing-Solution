import { api } from "./axios";
import type{
    CreateDistributorOrderRequest,
    DistributorOrderResponse, OrderStatus
} from "../models/Orders";

const API = "/distributor-orders";

/* ---------------- CREATE ORDER ---------------- */
export const createDistributorOrder = async (
    payload: CreateDistributorOrderRequest
): Promise<DistributorOrderResponse> => {
    const { data } = await api.post(API, payload);
    return data;
};

/* ---------------- GET ALL ORDERS ---------------- */
export const getDistributorOrders = async (): Promise<DistributorOrderResponse[]> => {
    const { data } = await api.get(API);
    return data;
};

/* ---------------- UPDATE STATUS ---------------- */
export const updateDistributorOrderStatus = async (
    orderId: number,
    status: OrderStatus // Use the enum type
): Promise<DistributorOrderResponse> => {
    // FIXED: Removed the comma after orderId
    const { data } = await api.put(`${API}/${orderId}/status`, { status });
    return data;
};


/* ---------------- CANCEL ORDER ---------------- */
export const cancelDistributorOrder = async (
    orderId: number,
    reason?: string
): Promise<DistributorOrderResponse> => {
    const { data } = await api.put(`${API}/${orderId}/cancel`, {
        reason
    });
    return data;
};

/* ---------------- RESET CACHE (FRONTEND ONLY) ---------------- */
/**
 * Used by UI to force refresh order list
 * No backend call required
 */
export const resetDistributorOrderCache = (): void => {
    // noop – cache reset handled by state/store (Zustand/React Query/etc.)
};
