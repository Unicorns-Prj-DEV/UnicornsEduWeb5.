"use client";

import Link from "next/link";
import { BrandLogoLockup } from "@/components/BrandLogoLockup";

export default function ErrorPage({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-md motion-fade-up">
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6 shadow-lg sm:p-8 motion-hover-lift">
          <div className="mb-6 flex justify-center px-1">
            <BrandLogoLockup
              variant="auth"
              className="max-w-full flex-wrap justify-center"
            />
          </div>

          <div className="mb-6 flex justify-center">
            <svg
              className="h-16 w-16 sm:h-20 sm:w-20"
              viewBox="0 0 64 64"
              fill="none"
              aria-hidden
            >
              <path
                d="M32 8L56 52H8L32 8Z"
                stroke="var(--color-warning)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M32 24v12"
                stroke="var(--color-warning)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle
                cx="32"
                cy="42"
                r="2"
                fill="var(--color-warning)"
              />
            </svg>
          </div>

          <h1 className="mb-2 text-center text-xl font-semibold text-text-primary sm:text-2xl">
            Đã xảy ra lỗi
          </h1>
          <p className="mb-6 text-center text-text-secondary">
            Rất tiếc, hệ thống vừa gặp sự cố. Vui lòng thử lại hoặc quay về trang chủ.
          </p>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={reset}
              className="w-full rounded-lg bg-primary py-2.5 font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2"
            >
              Thử lại
            </button>
            <Link
              href="/"
              className="w-full text-center text-sm text-primary hover:text-primary-hover"
            >
              ← Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
