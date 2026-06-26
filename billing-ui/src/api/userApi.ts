// src/api/userApi.ts
import { api } from "./axios";
import type { AuthUser } from "../models/Auth";

export async function getAllUsers(): Promise<AuthUser[]> {
    const r = await api.get<AuthUser[]>("/users");
    return r.data;
}

export async function registerUser(data: {
    username: string;
    password: string;
    role: "Admin" | "User" | "Operator";
}): Promise<AuthUser> {
    const r = await api.post<AuthUser>("/users", data);
    return r.data;
}

export async function changePassword(data: {
    oldPassword: string;
    newPassword: string;
}) {
    await api.post("/auth/change-password", data);
}

export async function toggleUser(id: number) {
    await api.put(`/users/${id}/status`);
}
