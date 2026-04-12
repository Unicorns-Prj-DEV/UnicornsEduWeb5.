"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogoLockup } from "@/components/BrandLogoLockup";

export default function NotFoundPage() {
  const router = useRouter();

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
              <rect
                x="10"
                y="6"
                width="44"
                height="52"
                rx="4"
                stroke="var(--color-text-muted)"
                strokeWidth="2.5"
              />
              <path
                d="M22 6v10h20"
                stroke="var(--color-text-muted)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 34h20M22 42h12"
                stroke="var(--color-text-muted)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="m36 28 6 6m0-6-6 6"
                stroke="var(--color-danger)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h1 className="mb-2 text-center text-xl font-semibold text-text-primary sm:text-2xl">
            Không tìm thấy trang
          </h1>
          <p className="mb-6 text-center text-text-secondary">
            Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển. Vui lòng kiểm tra lại đường dẫn.
          </p>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full rounded-lg bg-primary py-2.5 font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2"
            >
              Quay lại trang trước
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
