"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFullProfile } from "@/lib/apis/auth.api";

export default function StaffAccessGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["auth", "full-profile"],
    queryFn: getFullProfile,
    retry: false,
  });

  const roleType = data?.roleType;
  const staffRoles = data?.staffInfo?.roles ?? [];
  const isTeacher = staffRoles.includes("teacher");
  const isCustomerCare = staffRoles.includes("customer_care");
  const isCustomerCareSelfRoute = pathname.startsWith("/staff/customer-care-detail");
  const isAllowed = isCustomerCareSelfRoute
    ? roleType === "staff" && isCustomerCare
    : roleType === "admin" || (roleType === "staff" && isTeacher);

  const lockedLabel = isCustomerCareSelfRoute ? "Customer Care Locked" : "Staff Ops Locked";
  const lockedTitle = isCustomerCareSelfRoute
    ? "Tài khoản này không dùng được màn CSKH cá nhân."
    : "Tài khoản này không dùng được màn vận hành lớp học.";
  const lockedDescription = isCustomerCareSelfRoute
    ? "Màn này chỉ mở cho `staff.customer_care` và luôn khóa vào đúng hồ sơ nhân sự hiện tại."
    : "Màn này hiện mở cho `admin` hoặc `staff.teacher`. Teacher dùng nó để xem lớp phụ trách và thao tác buổi học; admin có thể truy cập để theo dõi hoặc hỗ trợ vận hành.";

  useEffect(() => {
    if (!isLoading && !isAllowed) {
      router.replace("/");
    }
  }, [isAllowed, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
        <div className="w-full max-w-xl rounded-[2rem] border border-border-default bg-bg-surface p-6 shadow-sm">
          <div className="h-3 w-32 animate-pulse rounded-full bg-bg-tertiary" />
          <div className="mt-4 h-8 w-56 animate-pulse rounded-xl bg-bg-tertiary" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-bg-tertiary" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-bg-tertiary" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !isAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
        <div className="w-full max-w-xl rounded-[2rem] border border-warning/30 bg-warning/10 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-warning">
            {lockedLabel}
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-text-primary">{lockedTitle}</h1>
          <p className="mt-3 text-sm text-text-secondary">{lockedDescription}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Về trang chủ
            </Link>
            <Link
              href="/user-profile"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Xem hồ sơ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
