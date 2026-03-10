import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
if (typeof window !== "undefined") {
  console.log("[Auth API] baseURL:", API_URL);
}

const api: AxiosInstance = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

let isRefreshing = false;
let refreshPromise: Promise<void | null> | null = null;
let failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(undefined);
        }
    });
    failedQueue = [];
};

const isPublicRoute = (pathname: string): boolean => {
    return pathname === '/login' ||
        pathname === '/register' ||
        pathname === '/forgot-password' ||
        pathname === '/reset-password' ||
        pathname === '/verify-email';
};

const shouldAttemptRefresh = (config?: AxiosRequestConfig): boolean => {
    if (!config?.url) {
        return false;
    }

    const url = config.url.toString();

    // Do not ever try to refresh for the refresh endpoint itself
    if (url.includes("/auth/refresh")) {
        return false;
    }

    return true;
};

const refresh = async (): Promise<void> => {
    try {
        await api.post("/auth/refresh");
    } catch {
        throw new Error("Token refresh failed");
    }
};

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        const status = error.response?.status;
        const originalRequest = error.config as
            | (AxiosRequestConfig & { _retry?: boolean })
            | undefined;

        if (
            (status === 401 || status === 500) &&
            originalRequest &&
            !originalRequest._retry &&
            shouldAttemptRefresh(originalRequest)
        ) {
            originalRequest._retry = true;

            if (!isRefreshing) {
                isRefreshing = true;
                refreshPromise = refresh()
                    .then(() => {
                        processQueue(null);
                    })
                    .catch((err) => {
                        processQueue(err as Error);
                    })
                    .finally(() => {
                        isRefreshing = false;
                        refreshPromise = null;
                    });
            }

            return new Promise((resolve, reject) => {
                failedQueue.push({
                    resolve: () => resolve(api(originalRequest)),
                    reject: (err) => reject(err || error),
                });
            });
        }

        if (typeof window !== "undefined" && (status === 401 || status === 500)) {
            const pathname = window.location.pathname;
            if (!isPublicRoute(pathname)) {
                window.location.href = "/";
            }
        }

        return Promise.reject(error);
    },
);

export { api };