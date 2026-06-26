export type UserRole = "Admin" | "User" | "Operator";

export interface AuthUser {
    id: number;
    username: string;
    role: UserRole;
}
