"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFullProfile } from "@/lib/apis/auth.api";

const LESSON_MANAGEMENT_ROUTE_PREFIXES = [
  "/admin/lesson-plans",
  "/admin/lesson-manage-details",
  "/admin/lessons",
];

const ACCOUNTANT_ALLOWED_PREFIXES = [
  "/admin/dashboard",
  "/admin/classes",
  "/admin/staffs",
  "/admin/costs",
  "/admin/lesson-plans",
  "/admin/lesson-manage-details",
];

function isLessonManagementRoute(pathname: string) {
  return LESSON_MANAGEMENT_ROUTE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
}

function isAccountantAllowedRoute(pathname: string) {
  return ACCOUNTANT_ALLOWED_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

export default function AdminAccessGate({
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
    staleTime: 60_000,
  });

  const roleType = data?.roleType;
  const staffRoles = data?.staffInfo?.roles ?? [];
  const hasStaffProfile = Boolean(data?.staffInfo?.id);
  const isAssistant = roleType === "staff" && hasStaffProfile && staffRoles.includes("assistant");
  const isAccountant = roleType === "staff" && hasStaffProfile && staffRoles.includes("accountant");
  const canManageLessonsAsStaff =
    roleType === "staff" &&
    hasStaffProfile &&
    staffRoles.includes("lesson_plan_head");
  const lessonManagementRoute = isLessonManagementRoute(pathname);
  const isAllowed =
    roleType === "admin" ||
    isAssistant ||
    (isAccountant && isAccountantAllowedRoute(pathname)) ||
    (canManageLessonsAsStaff && lessonManagementRoute);
  const fallbackHref = isAssistant
    ? "/admin/dashboard"
    : isAccountant
      ? "/admin/classes"
      : canManageLessonsAsStaff
        ? "/admin/lesson-plans"
        : "/";

  useEffect(() => {
    if (!isLoading && !isAllowed) {
      router.replace(fallbackHref);
    }
  }, [fallbackHref, isAllowed, isLoading, router]);

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-bg-primary px-4"
        aria-live="polite"
      >
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
    const title = canManageLessonsAsStaff
      ? "Role Trưởng giáo án chỉ mở được module Giáo Án."
      : "Tài khoản này không mở được khu quản trị.";
    const description = canManageLessonsAsStaff
      ? "Bạn có toàn quyền trên phần giáo án, nhưng các module admin khác vẫn bị khóa."
      : "Route này hiện chỉ mở cho admin, hoặc staff có role `lesson_plan_head` khi đang ở đúng module giáo án.";

    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
        <div className="w-full max-w-xl rounded-[2rem] border border-warning/30 bg-warning/10 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-warning">
            Admin Access Locked
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-text-primary">{title}</h1>
          <p className="mt-3 text-sm text-text-secondary">{description}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={fallbackHref}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              {canManageLessonsAsStaff ? "Đi tới Giáo Án" : "Về trang chủ"}
            </Link>
            <Link
              href="/user-profile"
              className="rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
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
