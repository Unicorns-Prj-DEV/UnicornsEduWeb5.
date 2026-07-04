/**
 * API base URL resolution for multi-instance deploy (IT + ENG share one web image).
 *
 * - Browser: same-origin `/api` (nginx strips prefix → NestJS).
 * - Server (RSC, proxy): `INTERNAL_API_URL` or `BACKEND_URL` from runtime `.env`.
 */
export const PUBLIC_API_BASE = "/api";

export function getServerApiOrigin(): string {
  const internal = process.env.INTERNAL_API_URL?.trim();
  if (internal) {
    return internal.replace(/\/$/, "");
  }

  const backend = process.env.BACKEND_URL?.trim();
  if (backend) {
    return backend.replace(/\/api\/?$/, "");
  }

  const legacy = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (legacy && legacy !== PUBLIC_API_BASE && !legacy.startsWith("/")) {
    return legacy.replace(/\/api\/?$/, "");
  }

  return "http://localhost:4000";
}

/** Axios / client fetch base — always same-origin in production. */
export function getClientApiBaseUrl(): string {
  const legacy = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (
    typeof window !== "undefined" &&
    legacy &&
    legacy !== PUBLIC_API_BASE &&
    !legacy.startsWith("/")
  ) {
    return legacy.replace(/\/$/, "");
  }
  return PUBLIC_API_BASE;
}

export function getNotificationSocketTarget(): {
  url: string;
  options: {
    path?: string;
    withCredentials: boolean;
    transports: ("websocket" | "polling")[];
  };
} {
  const legacy = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  const useSameOrigin =
    !legacy || legacy === PUBLIC_API_BASE || legacy.startsWith("/");

  if (useSameOrigin) {
    return {
      url: "/notifications",
      options: {
        path: "/socket.io",
        withCredentials: true,
        transports: ["websocket", "polling"],
      },
    };
  }

  return {
    url: `${legacy.replace(/\/$/, "")}/notifications`,
    options: {
      withCredentials: true,
      transports: ["websocket", "polling"],
    },
  };
}
