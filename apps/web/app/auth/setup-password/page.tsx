"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { SyntheticEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { FullProfileDto } from "@/dtos/profile.dto";
import { Role } from "@/dtos/Auth.dto";
import { useAuth } from "@/context/AuthContext";
import * as authApi from "@/lib/apis/auth.api";

const ROLE_REDIRECT: Record<string, string> = {
  admin: "/admin/dashboard",
  staff: "/staff",
  student: "/student",
  guest: "/",
};

function isAssistantStaffProfile(profile?: FullProfileDto | null) {
  return (
    profile?.roleType === "staff" &&
    (profile.staffInfo?.roles ?? []).includes("assistant")
  );
}

function resolvePostLoginRedirect(
  roleType: string,
  profile?: FullProfileDto | null,
): string {
  if (roleType === "admin") {
    return ROLE_REDIRECT.admin;
  }

  if (roleType === "staff") {
    if (isAssistantStaffProfile(profile)) {
      return "/admin/dashboard";
    }

    return profile?.staffInfo?.id ? ROLE_REDIRECT.staff : "/user-profile";
  }

  if (roleType === "student") {
    return profile?.studentInfo?.id ? ROLE_REDIRECT.student : "/user-profile";
  }

  return ROLE_REDIRECT[roleType] ?? "/";
}

function readSafeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return null;
  }

  return nextPath;
}

function hasAuthenticatedSession(user: {
  id: string;
  accountHandle: string;
}) {
  return Boolean(user.id && user.accountHandle);
}

async function redirectAfterSetup(params: {
  roleType: string;
  nextPath: string | null;
  queryClient: ReturnType<typeof useQueryClient>;
  router: ReturnType<typeof useRouter>;
}) {
  let fullProfile: FullProfileDto | null = null;

  try {
    fullProfile = await authApi.getFullProfile();
    params.queryClient.setQueryData(["auth", "full-profile"], fullProfile);
  } catch {
    fullProfile = null;
  }

  params.router.replace(
    params.nextPath ?? resolvePostLoginRedirect(params.roleType, fullProfile),
  );
}

function SetupPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, setUser, isAuthReady } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const source = searchParams.get("source");
  const nextPath = readSafeNextPath(searchParams.get("next"));
  const hasSession = hasAuthenticatedSession(user);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!hasSession) {
      router.replace("/auth/login");
      return;
    }

    if (!user.requiresPasswordSetup) {
      void redirectAfterSetup({
        roleType: user.roleType,
        nextPath,
        queryClient,
        router,
      });
    }
  }, [
    hasSession,
    isAuthReady,
    nextPath,
    queryClient,
    router,
    user.accountHandle,
    user.id,
    user.requiresPasswordSetup,
    user.roleType,
  ]);

  const setupPasswordMutation = useMutation({
    mutationFn: authApi.setupPassword,
    onSuccess: async () => {
      const nextUser = {
        ...user,
        requiresPasswordSetup: false,
      };

      toast.success("Mật khẩu đã được tạo. Đang chuyển tiếp...");
      setUser(nextUser);
      await redirectAfterSetup({
        roleType: nextUser.roleType,
        nextPath,
        queryClient,
        router,
      });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Không thể thiết lập mật khẩu. Vui lòng thử lại.";
      toast.error(message);
    },
  });

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (password.length < 6) {
      toast.error("Mật khẩu cần ít nhất 6 ký tự.");
      return;
    }

    setupPasswordMutation.mutate({ password });
  };

  if (!isAuthReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <p className="text-text-muted">Đang xác thực phiên đăng nhập...</p>
      </div>
    );
  }

  if (!hasSession) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-md motion-fade-up">
        <div className="rounded-2xl border border-border-default bg-bg-surface p-8 shadow-lg motion-hover-lift">
          <h1 className="text-2xl font-semibold text-text-primary text-center mb-2">
            Tạo mật khẩu
          </h1>
          <p className="text-sm text-text-muted text-center mb-6">
            {source === "google"
              ? "Đăng nhập Google đã thành công. Hoàn tất bước cuối để tiếp tục."
              : "Tài khoản này cần được thiết lập mật khẩu trước khi sử dụng."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="setup-password"
                className="block text-sm font-medium text-text-primary mb-1"
              >
                Mật khẩu mới
              </label>
              <input
                id="setup-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30 transition-colors duration-200"
                placeholder="Ít nhất 6 ký tự"
              />
            </div>

            <div>
              <label
                htmlFor="setup-confirm-password"
                className="block text-sm font-medium text-text-primary mb-1"
              >
                Xác nhận mật khẩu
              </label>
              <input
                id="setup-confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30 transition-colors duration-200"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={setupPasswordMutation.isPending}
              className="w-full rounded-lg bg-primary py-2.5 font-medium text-text-inverse hover:bg-primary-hover active:bg-primary-active focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 disabled:opacity-60 transition-colors duration-200"
            >
              {setupPasswordMutation.isPending
                ? "Đang lưu mật khẩu..."
                : "Hoàn tất và tiếp tục"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Bạn cần hoàn tất bước này trước khi dùng các route đã đăng nhập.
          </p>
          <p className="mt-2 text-center">
            <button
              type="button"
              onClick={async () => {
                try {
                  await authApi.logout();
                } finally {
                  setUser({
                    id: "",
                    accountHandle: "",
                    roleType: Role.guest,
                    requiresPasswordSetup: false,
                  });
                  router.replace("/auth/login");
                }
              }}
              className="text-sm text-primary hover:text-primary-hover font-medium"
            >
              Đăng xuất và quay lại đăng nhập
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bg-primary">
          <p className="text-text-muted">Đang tải...</p>
        </div>
      }
    >
      <SetupPasswordPageContent />
    </Suspense>
  );
}
