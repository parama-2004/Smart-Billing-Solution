import { api } from './axios';

type ReportParams = {
    type: string;
    from?: string;
    to?: string;
};

const buildReportParams = (type: string, from?: string, to?: string): ReportParams => {
    const params: ReportParams = { type };

    if (type === "range") {
        params.from = from;
        params.to = to;
    }

    return params;
};

export const getSalesReport = (
    type: string,
    from?: string,
    to?: string
) => {
    return api.get("/reports/sales", { params: buildReportParams(type, from, to) });
};

export const getSalesVatReport = (
    type: string,
    from?: string,
    to?: string
) => {
    return api.get("/reports/sales-vat", { params: buildReportParams(type, from, to) });
};

export const getPurchaseVatReport = (
    type: string,
    from?: string,
    to?: string
) => {
    return api.get("/reports/purchase-vat", { params: buildReportParams(type, from, to) });
};

export const getSalesGstReport = (
    type: string,
    from?: string,
    to?: string
) => {
    return api.get("/reports/sales-gst", { params: buildReportParams(type, from, to) });
};

export const getPurchaseGstReport = (
    type: string,
    from?: string,
    to?: string
) => {
    return api.get("/reports/purchase-gst", { params: buildReportParams(type, from, to) });
};