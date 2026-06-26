/**
 * useProducts — TanStack Query hook for product data.
 *
 * Replaces the manual `cachedProducts` global variable in productApi.ts.
 * All pages that need product data should use this hook instead of calling
 * getAllProductsCached() directly.
 *
 * Benefits over the old manual cache:
 *  - stale-while-revalidate: shows cached data instantly, refetches in background
 *  - automatic garbage collection when all consumers unmount
 *  - invalidateQueries() triggers a precise refetch instead of requiring manual
 *    resetProductCache() calls scattered across every write operation
 *  - no risk of serving forever-stale data if the app runs for days
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProducts } from "../api/productApi";

export const PRODUCTS_KEY = ["products"] as const;

/** Read hook — use anywhere you need the product list. */
export function useProducts() {
    return useQuery({
        queryKey: PRODUCTS_KEY,
        queryFn: getProducts,
        // Keep data fresh: refetch in background if it's older than 2 minutes.
        // Older Pentium machines benefit from NOT refetching on every window focus.
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}

/** Call this after any mutation (create / update / delete product or barcode)
 *  to trigger a background refetch for every component using useProducts(). */
export function useInvalidateProducts() {
    const qc = useQueryClient();
    return () => {
        qc.invalidateQueries({ queryKey: PRODUCTS_KEY });
        if (window.electron && window.electron.broadcastInvalidate) {
            window.electron.broadcastInvalidate(PRODUCTS_KEY);
        }
    };
}
