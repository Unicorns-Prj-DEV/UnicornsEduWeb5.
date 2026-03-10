"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

const ROLE_REDIRECT: Record<string, string> = {
  admin: "/admin",
  staff: "/mentor",
  student: "/student",
  guest: "/",
};

function parseHashParams(hash: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!hash || !hash.startsWith("#")) return params;
  const query = hash.slice(1);
  query.split("&").forEach((pair) => {
    const [key, value] = pair.split("=").map(decodeURIComponent);
    if (key && value) params[key] = value;
  });
  return params;
}

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      setStatus("error");
      setMessage(error === "google_no_user" ? "Không lấy được thông tin từ Google." : "Đăng nhập Google thất bại.");
      return;
    }

    const params = parseHashParams(typeof window !== "undefined" ? window.location.hash : "");
    const accessToken = params.access_token;
    const refreshToken = params.refresh_token;

    if (!accessToken || !refreshToken) {
      setStatus("error");
      setMessage("Thiếu token. Vui lòng thử đăng nhập lại.");
      return;
    }

    document.cookie = `access_token=${accessToken}; path=/; max-age=900; SameSite=Lax`;
    document.cookie = `refresh_token=${refreshToken}; path=/; max-age=2592000; SameSite=Lax`;
    setStatus("ok");
    const redirectPath = "/";
    router.replace(redirectPath);
    router.refresh();
  }, [router, searchParams]);

  if (status === "loading") {
    return (
      <p className="text-text-muted text-center">Đang đăng nhập...</p>
    );
  }
  if (status === "error") {
    return (
      <div className="space-y-4">
        <div
          className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {message}
        </div>
        <a
          href="/login"
          className="block text-center text-primary hover:text-primary-hover font-medium"
        >
          Quay lại đăng nhập
        </a>
      </div>
    );
  }
  return <p className="text-text-muted text-center">Đang chuyển hướng...</p>;
}

export default function GoogleCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-bg-surface p-8 shadow-lg">
        <h1 className="text-xl font-semibold text-text-primary text-center mb-6">
          Đăng nhập Google
        </h1>
        <Suspense fallback={<p className="text-text-muted text-center">Đang tải...</p>}>
          <CallbackContent />
        </Suspense>
      </div>
    </div>
  );
}
