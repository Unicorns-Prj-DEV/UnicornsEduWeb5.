"use client";

import Link from "next/link";
import { useState } from "react";
import * as authApi from "@/lib/apis/auth.api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setSuccess("Nếu email tồn tại và đã xác thực, bạn sẽ nhận được link đặt lại mật khẩu. Kiểm tra hộp thư (và thư mục spam).");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Gửi yêu cầu thất bại. Thử lại sau.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-md motion-fade-up">
        <div className="rounded-2xl border border-border-default bg-bg-surface p-8 shadow-lg motion-hover-lift">
          <h1 className="text-2xl font-semibold text-text-primary text-center mb-2">
            Quên mật khẩu
          </h1>
          <p className="text-sm text-text-muted text-center mb-6">
            Nhập email đăng ký để nhận link đặt lại mật khẩu
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
              <label htmlFor="forgot-email" className="block text-sm font-medium text-text-primary mb-1">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 font-medium text-text-inverse hover:bg-primary-hover active:bg-primary-active focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 disabled:opacity-60 transition-colors"
            >
              {loading ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
            </button>
          </form>

          <p className="mt-6 text-center">
            <Link href="/login" className="text-sm text-primary hover:text-primary-hover font-medium">
              ← Quay lại đăng nhập
            </Link>
          </p>
          <p className="mt-2 text-center">
            <Link href="/" className="text-sm text-text-secondary hover:text-text-primary">
              Về trang chủ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
