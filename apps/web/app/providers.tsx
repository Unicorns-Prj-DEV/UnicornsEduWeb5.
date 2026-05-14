"use client";

import {
  ACTION_HISTORY_INVALIDATION_EVENT,
  API_URL,
  RATE_LIMIT_TOAST_EVENT,
  type RateLimitToastDetail,
} from "@/lib/client";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { createGuestUser, Role, UserInfoDto } from "@/dtos/Auth.dto";
import type { NotificationPushEvent } from "@/dtos/notification.dto";
import { summarizeNotificationContent } from "@/lib/format-sidebar-notification-time";
import {
  OPEN_NOTIFICATION_DETAIL_EVENT,
  type OpenNotificationDetailPayload,
} from "@/lib/notification-tray-events";
import {
  useMutation,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { toast, Toaster } from "sonner";
import * as authApi from "@/lib/apis/auth.api";
import {
  buildSetupPasswordHref,
  resolvePasswordSetupNextPath,
} from "@/lib/auth-redirect";
import {
  isRestrictedByEmailVerification,
  maskEmailAddress,
  OPEN_EMAIL_VERIFICATION_MODAL_EVENT,
} from "@/lib/email-verification-access";
import {
  invalidateActionHistoryScopedQueries,
  invalidateNotificationFeedScopedQueries,
} from "@/lib/query-invalidation";

const defaultUser: UserInfoDto = createGuestUser();

const PASSWORD_SETUP_PATH = "/auth/setup-password";

function hasAuthenticatedSession(user: UserInfoDto) {
  return Boolean(user.id && user.accountHandle);
}

function EmailVerificationAccessModal() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    const handleOpen = () => {
      setOpen(true);
      setEmailInput("");
    };
    window.addEventListener(OPEN_EMAIL_VERIFICATION_MODAL_EVENT, handleOpen);
    return () => {
      window.removeEventListener(
        OPEN_EMAIL_VERIFICATION_MODAL_EVENT,
        handleOpen,
      );
    };
  }, []);

  const resendVerificationMutation = useMutation({
    mutationFn: authApi.resendVerificationEmail,
    onSuccess: (payload) => {
      const normalizedEmail = payload.email?.trim() ?? "";
      setUser({
        ...user,
        email: normalizedEmail || user.email || "",
        emailVerified: false,
        canAccessRestrictedRoutes: false,
      });
      queryClient.setQueryData(["auth", "session"], (prev: UserInfoDto) => ({
        ...(prev ?? user),
        email: normalizedEmail || user.email || "",
        emailVerified: false,
        canAccessRestrictedRoutes: false,
      }));
      toast.success("Đã gửi email xác minh. Vui lòng kiểm tra hộp thư.");
      setOpen(false);
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { message?: string } } };
      toast.error(ax.response?.data?.message ?? "Không gửi được email xác minh.");
    },
  });

  if (!open || !isRestrictedByEmailVerification(user)) {
    return null;
  }

  const currentEmail = user.email?.trim() ?? "";
  const hasEmail = currentEmail.length > 0;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-bg-surface p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-text-primary">
          Vui lòng xác minh email
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Bạn đã đăng nhập thành công nhưng cần xác minh email để mở các trang cá nhân và lớp học.
        </p>

        {hasEmail ? (
          <p className="mt-4 rounded-lg border border-border-default bg-bg-secondary px-3 py-2 text-sm text-text-primary">
            Email hiện tại: <span className="font-medium">{maskEmailAddress(currentEmail)}</span>
          </p>
        ) : (
          <div className="mt-4">
            <label
              htmlFor="verification-email"
              className="mb-1 block text-xs font-medium text-text-muted"
            >
              Nhập email để nhận link xác minh
            </label>
            <input
              id="verification-email"
              type="email"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/20"
            />
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={
              resendVerificationMutation.isPending ||
              (!hasEmail && emailInput.trim().length === 0)
            }
            onClick={() =>
              resendVerificationMutation.mutate(
                hasEmail ? {} : { email: emailInput.trim() },
              )
            }
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resendVerificationMutation.isPending ? "Đang gửi…" : "Xác minh"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionHistoryInvalidationBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleInvalidate = () => {
      void invalidateActionHistoryScopedQueries(queryClient);
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

  useEffect(() => {
    if (!canConnectRealtimeNotifications) {
      return;
    }

    const canOpenAdminChannel = user.roleType === Role.admin;
    const canOpenStaffChannel =
      user.roleType === Role.staff && Boolean(user.hasStaffProfile);
    const canOpenStudentChannel =
      user.roleType === Role.student && Boolean(user.hasStudentProfile);
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

      void invalidateNotificationFeedScopedQueries(queryClient);

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
    queryClient,
    user.hasStaffProfile,
    user.hasStudentProfile,
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

    router.replace(
      buildSetupPasswordHref(
        resolvePasswordSetupNextPath(pathname, searchParams),
      ),
    );
  }, [pathname, router, search, searchParams, isAuthReady, user]);

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
      <ThemeProvider>
        <ActionHistoryInvalidationBridge />
        <RateLimitToastBridge />
        <AuthProvider initialUser={initialUser ?? defaultUser}>
          <NotificationSocketBridge />
          <AuthPasswordSetupGate />
          <EmailVerificationAccessModal />
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
