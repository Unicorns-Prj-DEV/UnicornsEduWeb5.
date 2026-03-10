"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import * as authApi from "@/lib/apis/auth.api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [noToken, setNoToken] = useState(false);

  useEffect(() => {
    if (!token) setNoToken(true);
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu cần ít nhất 6 ký tự.");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      setSuccess("Đặt lại mật khẩu thành công. Đang chuyển đến trang đăng nhập...");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Link không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu link mới.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (noToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
        <div className="w-full max-w-md motion-fade-up">
          <div className="rounded-2xl border border-border-default bg-bg-surface p-8 shadow-lg text-center">
            <p className="text-text-primary mb-4">Thiếu link đặt lại mật khẩu. Vui lòng dùng link trong email.</p>
            <Link href="/forgot-password" className="text-primary hover:text-primary-hover font-medium">Gửi lại link</Link>
            <p className="mt-4">
              <Link href="/login" className="text-sm text-text-secondary">← Đăng nhập</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-md motion-fade-up">
        <div className="rounded-2xl border border-border-default bg-bg-surface p-8 shadow-lg motion-hover-lift">
          <h1 className="text-2xl font-semibold text-text-primary text-center mb-2">
            Đặt lại mật khẩu
          </h1>
          <p className="text-sm text-text-muted text-center mb-6">
            Nhập mật khẩu mới cho tài khoản của bạn
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="flex items-center gap-2 rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger"
                role="alert"
              >
                <span aria-hidden>⚠</span>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div
                className="flex items-center gap-2 rounded-lg border border-success bg-success/10 px-3 py-2 text-sm text-success"
                role="status"
              >
                <span aria-hidden>✓</span>
                <span>{success}</span>
              </div>
            )}

            <div>
              <label htmlFor="reset-password" className="block text-sm font-medium text-text-primary mb-1">
                Mật khẩu mới
              </label>
              <input
                id="reset-password"
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
              <label htmlFor="reset-confirm" className="block text-sm font-medium text-text-primary mb-1">
                Xác nhận mật khẩu
              </label>
              <input
                id="reset-confirm"
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
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 font-medium text-text-inverse hover:bg-primary-hover active:bg-primary-active focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 disabled:opacity-60 transition-colors"
            >
              {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
            </button>
          </form>

          <p className="mt-6 text-center">
            <Link href="/login" className="text-sm text-primary hover:text-primary-hover font-medium">
              ← Quay lại đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <p className="text-text-muted">Đang tải...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
