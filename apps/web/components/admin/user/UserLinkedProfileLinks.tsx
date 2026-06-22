"use client";

import Link from "next/link";
import type { AdminLikeRouteBase } from "@/lib/admin-shell-paths";
import {
  buildStaffDetailHref,
  buildStudentDetailHref,
  buildUserManageHref,
} from "@/lib/user-profile-links";

type Props = {
  routeBase: AdminLikeRouteBase;
  userId?: string;
  staffId?: string | null;
  studentId?: string | null;
  layout?: "inline" | "stack";
  showManageLink?: boolean;
  onNavigate?: () => void;
};

const linkClassName =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border-default bg-bg-surface px-3.5 py-2 text-sm font-medium text-text-primary transition hover:border-border-focus hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus";

export default function UserLinkedProfileLinks({
  routeBase,
  userId,
  staffId,
  studentId,
  layout = "inline",
  showManageLink = false,
  onNavigate,
}: Props) {
  const hasStaff = Boolean(staffId);
  const hasStudent = Boolean(studentId);
  const hasManage = showManageLink && Boolean(userId);

  if (!hasStaff && !hasStudent && !hasManage) {
    return null;
  }

  const containerClass =
    layout === "stack"
      ? "flex flex-col gap-2"
      : "flex flex-wrap gap-2";

  return (
    <div className={containerClass}>
      {hasStaff ? (
        <Link
          href={buildStaffDetailHref(routeBase, staffId!)}
          className={linkClassName}
          onClick={onNavigate}
        >
          <svg className="size-4 shrink-0 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7Z" />
          </svg>
          Chi tiết nhân sự
        </Link>
      ) : null}
      {hasStudent ? (
        <Link
          href={buildStudentDetailHref(routeBase, studentId!)}
          className={linkClassName}
          onClick={onNavigate}
        >
          <svg className="size-4 shrink-0 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5Zm0 0v7" />
          </svg>
          Chi tiết học sinh
        </Link>
      ) : null}
      {hasManage ? (
        <Link
          href={buildUserManageHref(routeBase, userId!)}
          className={linkClassName}
          onClick={onNavigate}
        >
          <svg className="size-4 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          Quản lý tài khoản
        </Link>
      ) : null}
    </div>
  );
}
