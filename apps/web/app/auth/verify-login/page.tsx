"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import * as authApi from "@/lib/apis/auth.api";
import { BrandLogoLockup } from "@/components/BrandLogoLockup";
import { AuthCardSkeleton } from "@/components/auth/AuthCardSkeleton";

type VerifyStatus = "loading" | "success" | "already" | "error";

function VerifyLoginContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<VerifyStatus>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Liên kết không hợp lệ.");
      return;
    }

    authApi
      .verifyLoginLink(token)
      .then((result) => {
        if (result.verified) {
          // Check if it was already verified (opened on different device)
          setStatus("already");
          setMessage("Đã xác minh thành công. Quay lại thiết bị vừa đăng nhập để hoàn tất.");
        } else {
          setStatus("success");
          setMessage("Đã xác minh thành công. Quay lại thiết bị vừa đăng nhập để hoàn tất.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Liên kết không hợp lệ hoặc đã hết hạn.");
      });
  }, [token]);

  return (
    <div className="flex min-h-dvh items-start justify-center bg-bg-primary px-4 py-6 sm:items-center sm:py-10">
      <div className="w-full max-w-md motion-fade-up">
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-lg motion-hover-lift sm:p-8">
          <div className="mb-6 flex justify-center px-1 sm:mb-8">
            <BrandLogoLockup
              variant="auth"
              className="max-w-full flex-wrap justify-center"
              priority
            />
          </div>

          {status === "loading" && (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="size-8 animate-spin rounded-full border-2 border-border-default border-t-primary" />
              </div>
              <p className="text-text-secondary">Đang xác minh…</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-success/10">
                  <svg
                    className="size-6 text-success"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </div>
              </div>
              <h1 className="text-xl font-semibold text-text-primary mb-2">
                Đã xác minh
              </h1>
              <p className="text-sm text-text-secondary">{message}</p>
            </div>
          )}

          {status === "already" && (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <svg
                    className="size-6 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </div>
              </div>
              <h1 className="text-xl font-semibold text-text-primary mb-2">
                Đã xác minh
              </h1>
              <p className="text-sm text-text-secondary">{message}</p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-error/10">
                  <svg
                    className="size-6 text-error"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </div>
              <h1 className="text-xl font-semibold text-text-primary mb-2">
                Lỗi
              </h1>
              <p className="text-sm text-text-secondary">{message}</p>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-text-muted">
            Đóng trang này và quay lại thiết bị vừa đăng nhập.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyLoginPage() {
  return (
    <Suspense
      fallback={
        <AuthCardSkeleton showInlineActions={false} showDivider={false} showSecondaryButton={false} footerRows={0} />
      }
    >
      <VerifyLoginContent />
    </Suspense>
  );
}
