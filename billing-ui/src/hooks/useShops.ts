import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllShops, getAllStockTransfers } from "../api/shopApi";

export const useShops = () => {
    return useQuery({
        queryKey: ["shops"],
        queryFn: getAllShops
    });
};

export const useInvalidateShops = () => {
    const queryClient = useQueryClient();
    return () => {
        queryClient.invalidateQueries({ queryKey: ["shops"] });
    };
};

export const useStockTransfers = () => {
    return useQuery({
        queryKey: ["stock-transfers"],
        queryFn: getAllStockTransfers
    });
};

export const useInvalidateStockTransfers = () => {
    const queryClient = useQueryClient();
    return () => {
        queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
    };
};
