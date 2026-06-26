import { api } from "./axios";
import type {
    GiftProductDto,
    CreateGiftProductRequest,
    LoyaltyRedemptionDto
} from "../models/Gift";

export const getAllGifts = async (): Promise<GiftProductDto[]> => {
    const res = await api.get<GiftProductDto[]>("/gifts");
    return res.data;
};

export const createGift = async (request: CreateGiftProductRequest): Promise<GiftProductDto> => {
    const res = await api.post<GiftProductDto>("/gifts", request);
    return res.data;
};

export const updateGift = async (id: number, request: CreateGiftProductRequest): Promise<GiftProductDto> => {
    const res = await api.put<GiftProductDto>(`/gifts/${id}`, request);
    return res.data;
};

export const getRedeemedGiftItems = async (): Promise<LoyaltyRedemptionDto[]> => {
    const res = await api.get<LoyaltyRedemptionDto[]>("/gifts/redeemed");
    return res.data;
};
