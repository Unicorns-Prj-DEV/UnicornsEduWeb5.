"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import * as authApi from "@/lib/apis/auth.api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Thiếu token xác thực. Kiểm tra link trong email.");
      return;
    }
    authApi
      .verifyEmail(token)
      .then((data: { message?: string }) => {
        setStatus("ok");
        setMessage((data?.message as string) ?? "Xác thực email thành công.");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Link không hợp lệ hoặc đã hết hạn.");
      });
  }, [token]);

  if (status === "loading") {
    return (
      <p className="text-text-muted text-center">Đang xác thực...</p>
    );
  }

  return (
    <>
      <div
        className={`rounded-lg border px-3 py-2 text-sm ${
          status === "ok"
            ? "border-success bg-success/10 text-success"
            : "border-danger bg-danger/10 text-danger"
        }`}
        role={status === "ok" ? "status" : "alert"}
      >
        {message}
      </div>
      <p className="mt-6 text-center">
        <Link href="/login" className="text-primary hover:text-primary-hover font-medium">
          Đi tới đăng nhập
        </Link>
      </p>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-md motion-fade-up">
        <div className="rounded-2xl border border-border-default bg-bg-surface p-8 shadow-lg">
          <h1 className="text-2xl font-semibold text-text-primary text-center mb-6">
            Xác thực email
          </h1>
          <Suspense fallback={<p className="text-text-muted text-center">Đang tải...</p>}>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
