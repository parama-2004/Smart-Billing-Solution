export interface SalesmanDto {
    id: number;
    name: string;
    dob?: string;
    address?: string;
    city?: string;
    mobile: string;
    dateOfJoin?: string;
    isActive: boolean;
}

export interface SalesmanCompensationSummaryDto {
    salesmanId: number;
    salesmanName: string;
    totalSalary: number;
    totalAdvance: number;
    netPaid: number;
}

export interface SalesmanCompensationDetailDto {
    id: number;
    entryDate: string;
    entryType: string;
    amount: number;
    source: string;
}
