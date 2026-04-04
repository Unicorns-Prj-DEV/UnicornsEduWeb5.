import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";

export const ACTION_HISTORY_INVALIDATION_EVENT = "ue:action-history:invalidate";
export const RATE_LIMIT_TOAST_EVENT = "ue:rate-limit:toast";

export type RateLimitToastDetail = {
    title: string;
    description: string;
};

export const API_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
if (typeof window !== "undefined") {
    console.log("[Auth API] baseURL:", API_URL);
}

const api: AxiosInstance = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

let isRefreshing = false;
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
    return pathname.includes("/auth");
};

const shouldInvalidateActionHistory = (config?: AxiosRequestConfig): boolean => {
    const method = config?.method?.toLowerCase();
    if (!method) {
        return false;
    }

    if (!["post", "put", "patch", "delete"].includes(method)) {
        return false;
    }

    const url = config?.url?.toString() ?? "";
    return !url.includes("/auth/refresh");
};

const notifyActionHistoryInvalidation = () => {
    if (typeof window === "undefined") {
        return;
    }

    window.dispatchEvent(new Event(ACTION_HISTORY_INVALIDATION_EVENT));
};

const getHeaderValue = (headers: unknown, name: string): string | null => {
    if (!headers) {
        return null;
    }

    if (typeof (headers as { get?: (headerName: string) => string | null }).get === "function") {
        return (headers as { get: (headerName: string) => string | null }).get(name);
    }

    const rawValue = (headers as Record<string, unknown>)[name];
    if (typeof rawValue === "string") {
        return rawValue;
    }

    if (Array.isArray(rawValue) && typeof rawValue[0] === "string") {
        return rawValue[0];
    }

    return null;
};

const parseRetryAfterSeconds = (value: string | null): number | null => {
    if (!value) {
        return null;
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return null;
    }

    const asSeconds = Number(trimmedValue);
    if (Number.isFinite(asSeconds) && asSeconds > 0) {
        return Math.ceil(asSeconds);
    }

    const asDate = Date.parse(trimmedValue);
    if (!Number.isFinite(asDate)) {
        return null;
    }

    const retryAfterSeconds = Math.ceil((asDate - Date.now()) / 1000);
    return retryAfterSeconds > 0 ? retryAfterSeconds : null;
};

const formatRetryDelay = (seconds: number): string => {
    if (seconds < 60) {
        return `${seconds} giây`;
    }

    const minutes = Math.ceil(seconds / 60);
    return minutes === 1 ? "1 phút" : `${minutes} phút`;
};

const buildRateLimitToastDetail = (error: AxiosError): RateLimitToastDetail => {
    const retryAfterSeconds = parseRetryAfterSeconds(
        getHeaderValue(error.response?.headers, "retry-after"),
    );

    return {
        title: "Too many requests",
        description: retryAfterSeconds
            ? `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${formatRetryDelay(retryAfterSeconds)}.`
            : "Bạn thao tác quá nhanh. Vui lòng đợi một chút rồi thử lại.",
    };
};

const normalizeRateLimitError = (error: AxiosError): RateLimitToastDetail => {
    const detail = buildRateLimitToastDetail(error);
    const normalizedMessage = `${detail.title}. ${detail.description}`;

    error.message = normalizedMessage;

    if (error.response?.data && typeof error.response.data === "object" && !Array.isArray(error.response.data)) {
        (
            error.response.data as {
                message?: string;
            }
        ).message = normalizedMessage;
    }

    return detail;
};

const shouldNotifyRateLimit = (config?: AxiosRequestConfig): boolean => {
    const method = config?.method?.toLowerCase();
    if (!method) {
        return true;
    }

    return ["get", "head", "options"].includes(method);
};

const notifyRateLimitToast = (detail: RateLimitToastDetail) => {
    if (typeof window === "undefined") {
        return;
    }

    window.dispatchEvent(
        new CustomEvent<RateLimitToastDetail>(RATE_LIMIT_TOAST_EVENT, {
            detail,
        }),
    );
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
    (response) => {
        if (shouldInvalidateActionHistory(response.config)) {
            notifyActionHistoryInvalidation();
        }

        return response;
    },
    (error: AxiosError) => {
        const status = error.response?.status;
        const originalRequest = error.config as
            | (AxiosRequestConfig & { _retry?: boolean })
            | undefined;

        if (status === 429) {
            const detail = normalizeRateLimitError(error);
            if (shouldNotifyRateLimit(originalRequest)) {
                notifyRateLimitToast(detail);
            }
        }

        if (
            (status === 401) &&
            originalRequest &&
            !originalRequest._retry &&
            shouldAttemptRefresh(originalRequest)
        ) {
            originalRequest._retry = true;

            if (!isRefreshing) {
                isRefreshing = true;
                void refresh()
                    .then(() => {
                        processQueue(null);
                    })
                    .catch((err) => {
                        processQueue(err as Error);
                    })
                    .finally(() => {
                        isRefreshing = false;
                    });
            }

            return new Promise((resolve, reject) => {
                failedQueue.push({
                    resolve: () => resolve(api(originalRequest)),
                    reject: (err) => reject(err || error),
                });
            });
        }

        if (typeof window !== "undefined" && (status === 401)) {
            const pathname = window.location.pathname;
            if (!isPublicRoute(pathname)) {
                window.location.href = "/";
            }
        }

        return Promise.reject(error);
    },
);

export { api };
