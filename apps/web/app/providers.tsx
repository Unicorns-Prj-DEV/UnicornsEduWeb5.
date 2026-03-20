"use client";

import { ACTION_HISTORY_INVALIDATION_EVENT } from "@/lib/client";
import { AuthProvider } from "@/context/AuthContext";
import { Role, UserInfoDto } from "@/dtos/Auth.dto";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

const defaultUser: UserInfoDto = {
  id: "",
  accountHandle: "",
  roleType: Role.guest,
};

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
        {children}
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
