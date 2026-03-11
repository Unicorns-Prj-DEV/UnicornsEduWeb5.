"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SyntheticEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import * as authApi from "@/lib/apis/auth.api";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const registerMutation = useMutation({
    mutationFn: (body: { fullName: string; phoneNumber: string; email: string; password: string }) => authApi.register(body),
    onSuccess: () => {
      toast.success("Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản trước khi đăng nhập.");
      setTimeout(() => router.push("/auth/login"), 3000);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Đăng ký thất bại. Email có thể đã được sử dụng.";
      toast.error(msg);
    },
  });

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Vui lòng nhập họ và tên.");
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error("Vui lòng nhập số điện thoại.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (password.length < 6) {
      toast.error("Mật khẩu cần ít nhất 6 ký tự.");
      return;
    }

    registerMutation.mutate({ fullName: fullName.trim(), phoneNumber: phoneNumber.trim(), email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-md motion-fade-up">
        <div className="rounded-2xl border border-border-default bg-bg-surface p-8 shadow-lg motion-hover-lift">
          <h1 className="text-2xl font-semibold text-text-primary text-center mb-2">
            Đăng ký
          </h1>
          <p className="text-sm text-text-muted text-center mb-6">
            Tạo tài khoản Unicorns Edu
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row">
              <div>
                <label htmlFor="reg-full-name" className="block text-sm font-medium text-text-primary mb-1">
                  Full Name
                </label>
                <input
                  id="reg-full-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30 transition-colors"
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div>
                <label htmlFor="reg-phone" className="block text-sm font-medium text-text-primary mb-1">
                  Phone Number
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30 transition-colors"
                  placeholder="0901234567"
                />
              </div>
            </div>
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-text-primary mb-1">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-text-primary mb-1">
                Mật khẩu
              </label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30 transition-colors"
                placeholder="Ít nhất 6 ký tự"
              />
            </div>

            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium text-text-primary mb-1">
                Xác nhận mật khẩu
              </label>
              <input
                id="reg-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full rounded-lg bg-primary py-2.5 font-medium text-text-inverse hover:bg-primary-hover active:bg-primary-active focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 disabled:opacity-60 transition-colors"
            >
              {registerMutation.isPending ? "Đang đăng ký..." : "Đăng ký"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Đã có tài khoản?{" "}
            <Link href="/auth/login" className="text-primary hover:text-primary-hover font-medium">
              Đăng nhập
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
