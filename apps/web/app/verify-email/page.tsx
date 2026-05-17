"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BrandLogoLockup } from "@/components/BrandLogoLockup";
import { verifyEmail } from "@/lib/apis/auth.api";

function VerifyEmailPageContent() {
  const searchParams = useSearchParams();
  const getSearchParam = searchParams.get.bind(searchParams);
  const token = getSearchParam("token")?.trim() ?? "";
  const verifyQuery = useQuery({
    queryKey: ["auth", "verify-email", token],
    queryFn: async () => verifyEmail(token),
    enabled: token.length > 0,
    retry: false,
  });

  const title = !token
    ? "Thiếu token xác thực"
    : verifyQuery.isPending
      ? "Đang xác thực email"
      : verifyQuery.isSuccess
        ? "Email đã được xác thực"
        : "Không thể xác thực email";
  const description = !token
    ? "Liên kết xác thực không hợp lệ hoặc đã bị cắt mất phần token."
    : verifyQuery.isPending
      ? "Hệ thống đang kiểm tra liên kết xác thực của bạn. Trang sẽ tự cập nhật khi hoàn tất."
      : verifyQuery.isSuccess
        ? ((verifyQuery.data as { message?: string } | undefined)?.message ??
          "Bạn có thể đăng nhập và tiếp tục sử dụng hệ thống.")
        : ((verifyQuery.error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ??
          "Liên kết xác thực đã hết hạn hoặc không còn hợp lệ.");

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4 py-12">
      <div className="w-full max-w-lg rounded-[2rem] border border-border-default bg-bg-surface p-8 shadow-lg">
        <div className="flex justify-center">
          <BrandLogoLockup
            variant="auth"
            className="max-w-full flex-wrap justify-center"
            priority
          />
        </div>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Email Verification
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-text-primary">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          {description}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/auth/login"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Đi tới đăng nhập
          </Link>
          <Link
            href="/auth/register"
            className="rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Tạo tài khoản khác
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}
