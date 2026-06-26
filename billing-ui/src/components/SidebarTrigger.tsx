import { PanelLeft } from "lucide-react";
import { useSidebar } from "../hooks/useSidebar";

type SidebarTriggerProps = {
    className?: string;
};

export default function SidebarTrigger({ className = "" }: SidebarTriggerProps) {
    const { toggleSidebar } = useSidebar();

    return (
        <button
            type="button"
            onClick={toggleSidebar}
            className={`sidebar-trigger inline-flex h-9 w-9 items-center justify-center  rounded-md border border-transparent bg-transparent transition-all hover:bg-accent ${className}`}
            aria-label="Toggle Sidebar"
        >
            <PanelLeft size={18} />
            <span className="sr-only">Toggle Sidebar</span>
        </button>
    );
}
