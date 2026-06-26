import { createContext, useMemo, useState, type ReactNode } from "react";

export type SidebarContextValue = {
    isExpanded: boolean;
    toggleSidebar: () => void;
    setExpanded: (value: boolean) => void;
};

export const SidebarContext = createContext<SidebarContextValue | null>(null);

type SidebarProviderProps = {
    children: ReactNode;
    defaultExpanded?: boolean;
};

export function SidebarProvider({ children, defaultExpanded = true }: SidebarProviderProps) {
    const [isExpanded, setExpanded] = useState(defaultExpanded);

    const value = useMemo(
        () => ({
            isExpanded,
            toggleSidebar: () => setExpanded((prev) => !prev),
            setExpanded,
        }),
        [isExpanded]
    );

    return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}
