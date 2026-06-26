export interface CustomerDto {
    id: number;
    customerCode: string;
    name: string;
    mobile: string;
    address: string;
    telephone?: string | null;
    email?: string | null;
    openingBalance: number;
    closingBalance: number;
    purchaseAmount: number;
    returnedAmount: number;
    loyaltyPoints: number;
}
