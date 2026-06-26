import axios from "axios";

type ElectronBridge = {
    apiUrl?: string;
};

// In Electron, the preload script exposes the dynamic API URL.
// In dev mode (browser), fall back to localhost.
const getBaseURL = (): string => {
    if (typeof window !== "undefined") {
        const electronWindow = window as Window & { electron?: ElectronBridge };
        if (electronWindow.electron?.apiUrl) {
            return electronWindow.electron.apiUrl;
        }
    }

    return "http://localhost:5683";
};

export const api = axios.create({
    timeout: 10000,
});

api.interceptors.request.use(
    config => {
        config.baseURL = getBaseURL();
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);