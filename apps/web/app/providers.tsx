"use client";

import { ACTION_HISTORY_INVALIDATION_EVENT } from "@/lib/client";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/context/AuthContext";
import { Role, UserInfoDto } from "@/dtos/Auth.dto";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

const defaultUser: UserInfoDto = {
  id: "",
  accountHandle: "",
  roleType: Role.guest,
  requiresPasswordSetup: false,
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

    window.addEventListener(ACTION_HISTORY_INVALIDATION_EVENT, handleInvalidate);
    return () => {
      window.removeEventListener(ACTION_HISTORY_INVALIDATION_EVENT, handleInvalidate);
    };
  }, [queryClient]);

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
  }, [
    pathname,
    router,
    search,
    isAuthReady,
    user.accountHandle,
    user.id,
    user.requiresPasswordSetup,
  ]);

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
      <AuthProvider initialUser={initialUser ?? defaultUser}>
        <AuthPasswordSetupGate />
        {children}
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
