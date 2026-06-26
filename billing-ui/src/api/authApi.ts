import { api } from "./axios";

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    id: number;
    username: string;
    role: "Admin" | "User";
    token: string;
}

export async function loginApi(
    request: LoginRequest
): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>("/auth/login", request);
    return res.data;
}

export async function verifyAdminApi(password: string): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>("/auth/verify-admin", { password });
    return res.data;
}
export async function checkDbStatus(): Promise<{ status: string; message?: string }> {
    try {
        const res = await api.get("/db-status");
        return res.data;
    } catch (error: any) {
        return { status: "error", message: error.message };
    }
}
