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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [accountHandle, setAccountHandle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [province, setProvince] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      toast.success("Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản trước khi đăng nhập.");
      setTimeout(() => router.push("/auth/login"), 3000);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Đăng ký thất bại. Email hoặc account handle có thể đã được sử dụng.";
      toast.error(msg);
    },
  });

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast.error("Vui lòng nhập tên.");
      return;
    }
    if (!lastName.trim()) {
      toast.error("Vui lòng nhập họ.");
      return;
    }
    if (!accountHandle.trim()) {
      toast.error("Vui lòng nhập account handle.");
      return;
    }
    if (!phone.trim()) {
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

    registerMutation.mutate({
      email: email.trim(),
      phone: phone.trim(),
      password,
      accountHandle: accountHandle.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      province: province.trim() || undefined,
    });
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="reg-last-name" className="block text-sm font-medium text-text-primary mb-1">
                  Họ
                </label>
                <input
                  id="reg-last-name"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30 transition-colors duration-200"
                  placeholder="Nguyễn"
                />
              </div>

              <div>
                <label htmlFor="reg-first-name" className="block text-sm font-medium text-text-primary mb-1">
                  Tên
                </label>
                <input
                  id="reg-first-name"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30 transition-colors duration-200"
                  placeholder="Văn A"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="reg-account-handle" className="block text-sm font-medium text-text-primary mb-1">
                  Account handle
                </label>
                <input
                  id="reg-account-handle"
                  type="text"
                  autoComplete="username"
                  required
                  value={accountHandle}
                  onChange={(e) => setAccountHandle(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30 transition-colors duration-200"
                  placeholder="nguyenvana"
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30 transition-colors duration-200"
                  placeholder="0901234567"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30 transition-colors duration-200"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="reg-province" className="block text-sm font-medium text-text-primary mb-1">
                  Tỉnh / Thành phố (tuỳ chọn)
                </label>
                <input
                  id="reg-province"
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30 transition-colors duration-200"
                  placeholder="TP.HCM"
                />
              </div>
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
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30 transition-colors duration-200"
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
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30 transition-colors duration-200"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full rounded-lg bg-primary py-2.5 font-medium text-text-inverse hover:bg-primary-hover active:bg-primary-active focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 disabled:opacity-60 transition-colors duration-200"
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
