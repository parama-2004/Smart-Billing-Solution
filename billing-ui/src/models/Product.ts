import type { BarcodeMasterDto } from "./Barcode";

export interface ProductDto {
    id: number;
    name: string;
    price: number;
    hsnCode?: string | null;
    stock: number;
    mrp: number;
    costPrice: number;
    gstPercentage: number;
    distributorId: number;
    distributorName: string;
    categoryCode: string | null;
    brandCode: string | null;
    barcodes?: BarcodeMasterDto[];
}
