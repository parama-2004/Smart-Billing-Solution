import { useEffect } from "react";

/**
 * Hook to dynamically update the document title.
 * @param title The title to set for the page.
 */
export function usePageTitle(title: string) {
    useEffect(() => {
        const previousTitle = document.title;
        document.title = `${title} | Billing Suite`;

        return () => {
            document.title = previousTitle;
        };
    }, [title]);
}
