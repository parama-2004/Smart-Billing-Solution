export interface DistributorDto {
    id: number;
    name: string;
    code?: string;           // Add this
    address: string;
    mobile: number;
    email?: string;
    telephone?: string;
    contactPerson?: string;  // Add this
    openingBalance: number;
    purchaseAmount: number;
    paidAmount: number;
    gstNumber?: string;
    returnedAmount: number;
    closingBalance: number;
    dateOfJoin: string;
}