"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { SyntheticEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import * as authApi from "@/lib/apis/auth.api";
import { Role, type LoginDto } from "@/dtos/Auth.dto";
import { useAuth } from "@/context/AuthContext";

const ROLE_REDIRECT: Record<string, string> = {
  admin: "/admin",
  staff: "/staff",
  student: "/student",
  guest: "/",
};

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accountHandle, setAccountHandle] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const { setUser } = useAuth();

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "google_no_user") toast.error("Không lấy được thông tin từ Google. Vui lòng thử lại.");
  }, [searchParams]);

  const loginMutation = useMutation({
    mutationFn: async (body: LoginDto) => {
      console.log(body);
      const loginResponse = await authApi.logIn(body);
      return loginResponse;
    },
    onSuccess: (loginResponse) => {
      toast.success("Đăng nhập thành công.");
      console.log(loginResponse);
      setUser({
        id: loginResponse.id,
        accountHandle: loginResponse.accountHandle,
        roleType: loginResponse.roleType,
      });
      router.push(ROLE_REDIRECT[loginResponse.roleType] ?? "/");
    },
    onError: (err: unknown) => {
      toast.error("Đăng nhập thất bại.");
    },
  });

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    loginMutation.mutate({ accountHandle, password, rememberMe });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-md motion-fade-up">
        <div className="rounded-2xl border border-border-default bg-bg-surface p-8 shadow-lg motion-hover-lift">
          <h1 className="text-2xl font-semibold text-text-primary text-center mb-2">
            Đăng nhập
          </h1>
          <p className="text-sm text-text-muted text-center mb-6">
            Unicorns Edu 5.0
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-account-handle" className="block text-sm font-medium text-text-primary mb-1">
                Email hoặc account handle
              </label>
              <input
                id="login-account-handle"
                type="text"
                autoComplete="username"
                required
                value={accountHandle}
                onChange={(e) => setAccountHandle(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30 transition-colors duration-200"
                placeholder="you@example.com hoặc nguyenvan"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-text-primary mb-1">
                Mật khẩu
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30 transition-colors duration-200"
                placeholder="••••••••"
              />
            </div>

            <div className="flex justify-between">
              <span className="flex items-center justify-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-sm border border-border-default bg-bg-surface accent-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                />
                <label htmlFor="remember-me" className="select-none text-sm text-text-primary ml-2">
                  Remember me for a month
                </label>
              </span>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-primary hover:text-primary-hover focus:outline-none focus:ring-2 focus:ring-border-focus rounded"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full rounded-lg bg-primary py-2.5 font-medium text-text-inverse hover:bg-primary-hover active:bg-primary-active focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 disabled:opacity-60 transition-colors duration-200"
            >
              {loginMutation.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-default" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-bg-surface px-2 text-text-muted">hoặc</span>
              </div>
            </div>

            <a
              href={`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"}/auth/google`}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-default bg-bg-surface py-2.5 font-medium text-text-primary hover:bg-bg-tertiary focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 transition-colors duration-200"
            >
              <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Đăng nhập bằng Google
            </a>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Chưa có tài khoản?{" "}
            <Link href="/auth/register" className="text-primary hover:text-primary-hover font-medium">
              Đăng ký
            </Link>
          </p>
          <p className="mt-2 text-center">
            <Link href="/" className="text-sm text-text-secondary hover:text-text-primary">
              ← Về trang chủ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
