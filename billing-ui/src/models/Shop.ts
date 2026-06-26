export interface ShopDto {
    id: number;
    name: string;
    city: string;
}

export interface CreateShopRequest {
    name: string;
    city: string;
}

export interface UpdateShopRequest {
    name: string;
    city: string;
}

export interface StockTransferDto {
    id: number;
    transferDate: string;
    productId: number;
    productName: string;
    productBarcode?: string;
    quantity: number;
    transferType: string; // "In" or "Out"
    shopId: number;
    shopName: string;
    price: number;
    amount: number;
}

export interface CreateStockTransferRequest {
    transferDate: string;
    productId: number;
    quantity: number;
    transferType: string;
    shopId: number;
}
