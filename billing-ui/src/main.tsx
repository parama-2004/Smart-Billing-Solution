import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { HashRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Conservative defaults for Pentium + HDD machines:
//   • staleTime 2 min  — don't re-fetch on every tiny interaction
//   • refetchOnWindowFocus false — no silent fetches when user alt-tabs
//   • retry 1  — fail fast rather than hammering a slow local API
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 2 * 60 * 1000,
            refetchOnWindowFocus: true, // We turn this back on to be safe across window transitions
            retry: 1,
        },
    },
});

// Listen for cross-window invalidations broadcasted by the main process
if (typeof window !== "undefined" && window.electron && window.electron.onInvalidate) {
    window.electron.onInvalidate((key: any) => {
        console.log("Cross-window invalidation received for key:", key);
        queryClient.invalidateQueries({ queryKey: key });
    });
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <HashRouter>
                <App />
            </HashRouter>
        </QueryClientProvider>
    </StrictMode>,
)
