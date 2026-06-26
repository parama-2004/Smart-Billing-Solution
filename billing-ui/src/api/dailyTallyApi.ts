import { api } from "./axios";
import type {
    AnnualTallyReportResponse,
    DailyTallyResponseDto,
    SaveDailyTallyRequest
} from "../models/DailyTally";

export const saveDailyTally = async (request: SaveDailyTallyRequest): Promise<DailyTallyResponseDto> => {
    const res = await api.post<DailyTallyResponseDto>("/daily-tally", request);
    return res.data;
};

export const getDailyTallyByDate = async (date: string): Promise<DailyTallyResponseDto> => {
    const res = await api.get<DailyTallyResponseDto>("/daily-tally/by-date", {
        params: { date }
    });
    return res.data;
};

export const getAnnualTallyReport = async (
    year?: number,
    from?: string,
    to?: string,
    expenseName?: string
): Promise<AnnualTallyReportResponse> => {
    const res = await api.get<AnnualTallyReportResponse>("/daily-tally/annual", {
        params: { year, from, to, expenseName }
    });
    return res.data;
};
