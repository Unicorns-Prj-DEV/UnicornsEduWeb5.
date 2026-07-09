"use client";

import { useQuery } from "@tanstack/react-query";
import AdminClassesPage from "@/app/admin/classes/page";
import { Skeleton } from "@/components/ui/skeleton";
import { getFullProfile } from "@/lib/apis/auth.api";
import * as staffOpsApi from "@/lib/apis/staff-ops.api";
import { authKeys } from "@/lib/query-keys";

function StaffClassesRouteLoadingShell() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <Skeleton className="h-8 w-48 rounded-lg" />
      <Skeleton className="mt-4 h-10 w-full max-w-md rounded-xl" />
      <Skeleton className="mt-4 h-72 w-full rounded-[1.5rem]" />
    </div>
  );
}

function hasStaffClassOpsListAccess(roles: string[], roleType?: string): boolean {
  return (
    roleType === "admin" ||
    roles.includes("admin") ||
    roles.includes("assistant") ||
    roles.includes("accountant_income") ||
    roles.includes("accountant_expense")
  );
}

export default function StaffClassesPage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: authKeys.fullProfile(),
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });

  if (isLoading && !profile) {
    return <StaffClassesRouteLoadingShell />;
  }

  const staffRoles = profile?.staffInfo?.roles ?? [];

  if (hasStaffClassOpsListAccess(staffRoles, profile?.roleType)) {
    return <AdminClassesPage />;
  }

  if (staffRoles.includes("training")) {
    return (
      <AdminClassesPage
        classListFetcher={staffOpsApi.getClasses}
        forceReadOnlyList
        pageSubtitle="Danh sách các lớp bạn đang được gán quản lý."
      />
    );
  }

  return null;
}
