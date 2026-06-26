export interface GiftProductDto {
    id: number;
    productName: string;
    requiredPoints: number;
    isActive: boolean;
}

export interface CreateGiftProductRequest {
    productName: string;
    requiredPoints: number;
    isActive: boolean;
}

export interface LoyaltyRedemptionDto {
    id: number;
    invoiceId: number;
    customerId?: number;
    customerName: string;
    customerCode: string;
    type: string;
    pointsUsed: number;
    discountAmount: number;
    giftProductName?: string;
    redeemedOn: string;
}
