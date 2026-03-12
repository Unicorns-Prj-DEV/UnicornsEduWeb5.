"use client";

import { AuthProvider } from "@/context/AuthContext";
import { Role, UserInfoDto } from "@/dtos/Auth.dto";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

const defaultUser: UserInfoDto = {
  id: "",
  accountHandle: "",
  roleType: Role.guest,
};

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
      <AuthProvider initialUser={initialUser ?? defaultUser}>
        {children}
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
