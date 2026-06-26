export type TallyValueItemDto = {
    name: string;
    value: number;
};

export type TallyTextItemDto = {
    name: string;
    value: string;
};

export type TallyVendorItemDto = {
    name: string;
    amount: number;
};

export type StaffCompensationItemDto = {
    salesmanId: number;
    salesmanName: string;
    amount: number;
};

export type CashDenominationItemDto = {
    name: string;
    count: number;
    amount: number;
};

export type DailyTallyPayloadDto = {
    internalExpenses: TallyValueItemDto[];
    externalExpenses: TallyValueItemDto[];
    paymentVendors: TallyVendorItemDto[];
    staffSalaries: StaffCompensationItemDto[];
    staffAdvances: StaffCompensationItemDto[];
    approximateValues: TallyValueItemDto[];
    dailyTallyValues: TallyValueItemDto[];
    actualValues: TallyValueItemDto[];
    cashDenominations: CashDenominationItemDto[];
};

export type SaveDailyTallyRequest = {
    tallyDate: string;
    payload: DailyTallyPayloadDto;
    totalIncome: number;
    totalExpenses: number;
    net: number;
    statusDifference: number;
};

export type DailyTallyResponseDto = {
    id: number;
    tallyDate: string;
    payload: DailyTallyPayloadDto;
    totalIncome: number;
    totalExpenses: number;
    net: number;
    statusDifference: number;
    updatedAt: string;
};

export type AnnualTallyRowDto = {
    month: number;
    monthName: string;
    entryCount: number;
    totalIncome: number;
    totalExpenses: number;
    net: number;
};

export type AnnualTallyReportResponse = {
    year?: number;
    fromDate: string;
    toDate: string;
    rows: AnnualTallyRowDto[];
    totalIncome: number;
    totalExpenses: number;
    net: number;
    expenseName?: string;
    expenseTotal: number;
};
