export interface BarcodeMasterDto {
    id: number;
    barcodeValue: string;
    productId: number;
    productName: string;
    price: number;
    mrp: number;
    costPrice: number;
    variant?: string | null;
    batchNumber?: string | null;
    gstPercentage: number;
    createdAt: string;
    isActive: boolean;
}

export interface CreateBarcodeRequest {
    barcodeValue: string;
    productId: number;
    price: number;
    mrp: number;
    costPrice: number;
    gstPercentage: number;
    variant?: string | null;
    batchNumber?: string | null;
}

export interface UpdateBarcodeRequest {
    barcodeValue: string;
    price: number;
    mrp: number;
    costPrice: number;
    gstPercentage: number;
    variant?: string | null;
    batchNumber?: string | null;
    isActive: boolean;
}
