"use client";

import {
  ACTION_HISTORY_INVALIDATION_EVENT,
  API_URL,
  RATE_LIMIT_TOAST_EVENT,
  type RateLimitToastDetail,
} from "@/lib/client";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/context/AuthContext";
import { Role, UserInfoDto } from "@/dtos/Auth.dto";
import type { NotificationPushEvent } from "@/dtos/notification.dto";
import { getFullProfile } from "@/lib/apis/auth.api";
import { summarizeNotificationContent } from "@/lib/format-sidebar-notification-time";
import { NOTIFICATION_FEED_QUERY_KEY } from "@/lib/notification-feed-query";
import {
  OPEN_NOTIFICATION_DETAIL_EVENT,
  type OpenNotificationDetailPayload,
} from "@/lib/notification-tray-events";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { toast, Toaster } from "sonner";

const defaultUser: UserInfoDto = {
  id: "",
  accountHandle: "",
  roleType: Role.guest,
  requiresPasswordSetup: false,
  avatarUrl: null,
};

const PASSWORD_SETUP_PATH = "/auth/setup-password";

function isSafeInternalPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//");
}

function hasAuthenticatedSession(user: UserInfoDto) {
  return Boolean(user.id && user.accountHandle);
}

function ActionHistoryInvalidationBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleInvalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["action-history"] });
    };

    window.addEventListener(
      ACTION_HISTORY_INVALIDATION_EVENT,
      handleInvalidate,
    );
    return () => {
      window.removeEventListener(
        ACTION_HISTORY_INVALIDATION_EVENT,
        handleInvalidate,
      );
    };
  }, [queryClient]);

  return null;
}

function RateLimitToastBridge() {
  useEffect(() => {
    const handleRateLimitToast = (event: Event) => {
      const detail = (event as CustomEvent<RateLimitToastDetail>).detail;

      toast.error(detail?.title ?? "Too many requests", {
        id: RATE_LIMIT_TOAST_EVENT,
        description:
          detail?.description ??
          "Bạn thao tác quá nhanh. Vui lòng đợi một chút rồi thử lại.",
      });
    };

    window.addEventListener(RATE_LIMIT_TOAST_EVENT, handleRateLimitToast);
    return () => {
      window.removeEventListener(RATE_LIMIT_TOAST_EVENT, handleRateLimitToast);
    };
  }, []);

  return null;
}

function NotificationSocketBridge() {
  const { user, isAuthReady } = useAuth();
  const queryClient = useQueryClient();
  const recentNotificationKeysRef = useRef<string[]>([]);
  const canConnectRealtimeNotifications =
    isAuthReady &&
    hasAuthenticatedSession(user) &&
    (user.roleType === Role.admin ||
      user.roleType === Role.staff ||
      user.roleType === Role.student);
  const needsRealtimeProfile =
    canConnectRealtimeNotifications &&
    (user.roleType === Role.staff || user.roleType === Role.student);
  const { data: fullProfile } = useQuery({
    queryKey: ["auth", "full-profile"],
    queryFn: getFullProfile,
    enabled: needsRealtimeProfile,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!canConnectRealtimeNotifications) {
      return;
    }

    const canOpenAdminChannel = user.roleType === Role.admin;
    const canOpenStaffChannel =
      user.roleType === Role.staff && Boolean(fullProfile?.staffInfo?.id);
    const canOpenStudentChannel =
      user.roleType === Role.student && Boolean(fullProfile?.studentInfo?.id);
    if (
      !canOpenAdminChannel &&
      !canOpenStaffChannel &&
      !canOpenStudentChannel
    ) {
      return;
    }

    const socket = io(`${API_URL.replace(/\/$/, "")}/notifications`, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    const rememberNotification = (key: string) => {
      const recentKeys = recentNotificationKeysRef.current;
      if (recentKeys.includes(key)) {
        return false;
      }

      recentKeys.push(key);
      if (recentKeys.length > 200) {
        recentKeys.splice(0, recentKeys.length - 200);
      }

      return true;
    };

    const handleNotificationPushed = (event: NotificationPushEvent) => {
      const eventKey = `${event.id}:${event.version}`;
      if (!rememberNotification(eventKey)) {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({
        queryKey: NOTIFICATION_FEED_QUERY_KEY,
      });

      const openNotificationDetail = () => {
        const payload: OpenNotificationDetailPayload = {
          id: event.id,
          title: event.title,
          message: event.message,
          lastPushedAt: event.lastPushedAt,
          deliveryKind: event.deliveryKind,
          version: event.version,
        };
        window.dispatchEvent(
          new CustomEvent<OpenNotificationDetailPayload>(
            OPEN_NOTIFICATION_DETAIL_EVENT,
            { detail: payload },
          ),
        );
      };

      const compactSummary = summarizeNotificationContent(event.message, 88);
      toast.custom(
        (toastId) => (
          <button
            type="button"
            onClick={() => {
              openNotificationDetail();
              toast.dismiss(toastId);
            }}
            className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-left shadow-sm transition hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <p className="text-sm font-semibold text-text-primary">
              {event.deliveryKind === "adjusted"
                ? "Thông báo được cập nhật"
                : "Thông báo mới từ admin"}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {event.title} · {compactSummary}
            </p>
            <p className="mt-1 text-[11px] text-primary">Bấm để mở chi tiết</p>
          </button>
        ),
        { id: eventKey, duration: 10000 },
      );
    };

    socket.on("notification.pushed", handleNotificationPushed);

    return () => {
      socket.off("notification.pushed", handleNotificationPushed);
      socket.disconnect();
    };
  }, [
    canConnectRealtimeNotifications,
    fullProfile?.staffInfo?.id,
    fullProfile?.studentInfo?.id,
    queryClient,
    user.roleType,
  ]);

  return null;
}

function AuthPasswordSetupGate() {
  const { user, isAuthReady } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!hasAuthenticatedSession(user) || !user.requiresPasswordSetup) {
      return;
    }

    if (pathname === PASSWORD_SETUP_PATH) {
      return;
    }

    const nextPath = `${pathname}${search ? `?${search}` : ""}`;
    const safeNextPath = isSafeInternalPath(nextPath) ? nextPath : "/";
    router.replace(
      `${PASSWORD_SETUP_PATH}?next=${encodeURIComponent(safeNextPath)}`,
    );
  }, [pathname, router, search, isAuthReady, user]);

  return null;
}

export function Providers({
  children,
  initialUser,
}: Readonly<{
  children: React.ReactNode;
  initialUser?: UserInfoDto;
}>) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ActionHistoryInvalidationBridge />
      <RateLimitToastBridge />
      <AuthProvider initialUser={initialUser ?? defaultUser}>
        <NotificationSocketBridge />
        <AuthPasswordSetupGate />
        {children}
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
