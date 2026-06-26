import { api } from './axios';
import type {
    CreatePurchaseRequest,
    PurchaseResponse,
    CreatePurchasePaymentRequest
} from '../models/Purchase';

// Cache management is now handled by React Query

export async function createPurchase(request: CreatePurchaseRequest): Promise<PurchaseResponse> {
    try {
        const response = await api.post<PurchaseResponse>('/purchases', request);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Failed to create purchase');
    }
}

export async function getAllPurchases(): Promise<PurchaseResponse[]> {
    try {
        const response = await api.get<PurchaseResponse[]>('/purchases');
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Failed to fetch purchases');
    }
}

export async function getPurchaseById(id: number): Promise<PurchaseResponse | null> {
    try {
        const response = await api.get<PurchaseResponse>(`/purchases/${id}`);
        return response.data;
    } catch (error: any) {
        if (error.response?.status === 404) {
            return null;
        }
        throw new Error(error.response?.data?.message || 'Failed to fetch purchase');
    }
}

export async function getPurchasesByDateRange(startDate: Date, endDate: Date): Promise<PurchaseResponse[]> {
    try {
        const start = startDate.toISOString().split('T')[0];
        const end = endDate.toISOString().split('T')[0];
        const response = await api.get<PurchaseResponse[]>(`/purchases/by-date/${start}/${end}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Failed to fetch purchases by date');
    }
}

export async function getPurchasesByDistributor(distributorId: number): Promise<PurchaseResponse[]> {
    try {
        const response = await api.get<PurchaseResponse[]>(`/purchases/by-distributor/${distributorId}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Failed to fetch purchases by distributor');
    }
}

export async function addPurchasePayment(purchaseId: number, request: CreatePurchasePaymentRequest): Promise<PurchaseResponse> {
    try {
        const response = await api.post<PurchaseResponse>(`/purchases/${purchaseId}/payments`, request);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Failed to add payment');
    }
}

export async function deletePayment(paymentId: number): Promise<boolean> {
    try {
        const response = await api.delete(`/purchases/payments/${paymentId}`);
        return response.status === 204;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Failed to delete payment');
    }
}

export async function cancelPurchase(purchaseId: number): Promise<boolean> {
    try {
        const response = await api.post(`/purchases/${purchaseId}/cancel`);
        return response.status === 200;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Failed to cancel purchase');
    }
}

export async function getTotalOutstanding(): Promise<number> {
    try {
        const response = await api.get<{ totalOutstanding: number }>('/purchases/outstanding/total');
        return response.data.totalOutstanding;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Failed to fetch total outstanding');
    }
}

export async function getTodaySummary(): Promise<any> {
    try {
        const response = await api.get('/purchases/summary/today');
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Failed to fetch today summary');
    }
}

export async function getAllPurchasesCached(): Promise<PurchaseResponse[]> {
    return await getAllPurchases();
}

export function resetPurchaseCache(): void {
    // Handled by React Query
}

export async function updatePurchase(id: number, request: UpdatePurchaseRequest): Promise<PurchaseResponse> {
    try {
        const response = await api.put<PurchaseResponse>(`/purchases/${id}`, request);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Failed to update purchase');
    }
}

// Add UpdatePurchaseRequest interface
export interface UpdatePurchaseRequest extends CreatePurchaseRequest {
    // Same as CreatePurchaseRequest for now
}