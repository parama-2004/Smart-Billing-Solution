import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllDistributorsCached } from "../api/distributorApi";
import { getAllBrands, getAllCategories } from "../api/masterApi";
import { getAllSalesmen, getSalesmanCompensationSummary } from "../api/salesmanApi";
import { getAllGifts, getRedeemedGiftItems } from "../api/giftApi";
import { getChequeIssuedReport } from "../api/chequeIssuedApi";
import type { ChequeIssuedResponse } from "../models/ChequeIssued";
import { getDistributorOrders } from "../api/orderApi";
import { getAllPurchasesCached } from "../api/purchaseApi";

export const DISTRIBUTORS_KEY = ["distributors"] as const;
export const BRANDS_KEY = ["brands"] as const;
export const CATEGORIES_KEY = ["categories"] as const;
export const SALESMEN_KEY = ["salesmen"] as const;
export const SALESMEN_SUMMARY_KEY = ["salesmen-summary"] as const;
export const GIFTS_KEY = ["gifts"] as const;
export const REDEEMED_GIFTS_KEY = ["redeemed-gifts"] as const;
export const PURCHASES_KEY = ["purchases"] as const;
export const CHEQUES_KEY = ["cheques"] as const;
export const DAILY_TALLY_KEY = ["daily-tally"] as const;
export const PAYMENTS_KEY = ["payments"] as const;
export const ORDERS_KEY = ["orders"] as const;
export const BANKS_KEY = ["banks"] as const;

/** 
 * Generic hook to invalidate a specific query key locally 
 * AND broadcast it to all other open Electron windows via IPC.
 */
export function useInvalidateQuery() {
    const qc = useQueryClient();
    return (key: readonly string[]) => {
        qc.invalidateQueries({ queryKey: key });
        if (window.electron && window.electron.broadcastInvalidate) {
            window.electron.broadcastInvalidate(key);
        }
    };
}

// Master Data Hooks
export function useBanks() {
    return useQuery({ queryKey: BANKS_KEY, queryFn: () => import("../api/bankApi").then(m => m.getBanks()) });
}

export function useDistributors() {
    return useQuery({ queryKey: DISTRIBUTORS_KEY, queryFn: getAllDistributorsCached });
}

export function useBrands() {
    return useQuery({ queryKey: BRANDS_KEY, queryFn: getAllBrands });
}

export function useCategories() {
    return useQuery({ queryKey: CATEGORIES_KEY, queryFn: getAllCategories });
}

export function useSalesmen() {
    return useQuery({ queryKey: SALESMEN_KEY, queryFn: getAllSalesmen });
}

export function useSalesmanCompensationSummary() {
    return useQuery({ queryKey: SALESMEN_SUMMARY_KEY, queryFn: getSalesmanCompensationSummary });
}

export function useGifts() {
    return useQuery({ queryKey: GIFTS_KEY, queryFn: getAllGifts });
}

export function useRedeemedGifts() {
    return useQuery({ queryKey: REDEEMED_GIFTS_KEY, queryFn: getRedeemedGiftItems });
}

// Transactional Data Hooks
export function usePurchases() {
    return useQuery({ queryKey: PURCHASES_KEY, queryFn: getAllPurchasesCached });
}

export function useChequeIssued(fromDate?: string, toDate?: string) {
    return useQuery<ChequeIssuedResponse[], Error>({
        queryKey: [...CHEQUES_KEY, fromDate, toDate] as const,
        queryFn: () => getChequeIssuedReport(fromDate, toDate)
    });
}

export function useOrders() {
    return useQuery({ queryKey: ORDERS_KEY, queryFn: getDistributorOrders });
}
