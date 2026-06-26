import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type UserRole = "Admin" | "User" | "Operator";

export interface AuthUser {
    id: number;
    username: string;
    role: UserRole;
}

interface AuthContextType {
    user: AuthUser | null;
    login: (u: AuthUser, token: string) => void;
    logout: () => void;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
    // Example: store expiry and validate on init
    const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

    const [user, setUser] = useState<AuthUser | null>(() => {
        const stored = localStorage.getItem("user");
        const token = localStorage.getItem("token");
        const expiry = localStorage.getItem("userExpiry");
        if (!stored || !token || !expiry) return null;
        if (Date.now() > parseInt(expiry, 10)) {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            localStorage.removeItem("userExpiry");
            return null;
        }
        return JSON.parse(stored);
    });

    const login = (u: AuthUser, token: string) => {
        setUser(u);
        localStorage.setItem("user", JSON.stringify(u));
        localStorage.setItem("token", token);
        localStorage.setItem("userExpiry", String(Date.now() + TOKEN_TTL_MS));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("userExpiry");
        window.location.href = "/#/";  // Redirect to login in current window
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                login,
                logout,
                isAdmin: user?.role === "Admin"
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);