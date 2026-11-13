"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminStaffPage from "@/app/admin/staffs/page";
import { StaffListTableSkeleton } from "@/components/admin/staff";
import SaleCsTeamStaffList from "@/components/staff/sale-cs-team/SaleCsTeamStaffList";
import { getFullProfile } from "@/lib/apis/auth.api";
import { resolveAdminShellAccess } from "@/lib/admin-shell-access";
import { AUTH_FULL_PROFILE_QUERY_KEY } from "@/lib/profile-full-query";

/**
 * `/staff/staffs` — danh sách nhân sự trong staff shell:
 * - Admin / Kế toán chi: trang `/admin/staffs` đầy đủ (`routeBase` `/staff`);
 * - Trưởng phòng Sale & CSKH: cùng bố cục nhưng chỉ đội Sale & CSKH, dữ liệu
 *   giới hạn (#270, #271) — thay trang `/staff/sale-cs-team` cũ.
 * Gate (`staff-shell-access.ts`) chặn các role khác trước khi tới đây.
 */
export default function StaffStaffsRoute() {
  const { data: profile, isLoading } = useQuery({
    queryKey: AUTH_FULL_PROFILE_QUERY_KEY,
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });
  const access = resolveAdminShellAccess(profile);

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 pb-8 sm:p-6">
        <StaffListTableSkeleton rows={5} />
      </div>
    );
  }

  if (access.isAdmin || access.isAccountantExpense) return <AdminStaffPage />;
  if (!access.isAssistant) return null;

  return (
    <Suspense fallback={null}>
      <SaleCsTeamStaffList />
    </Suspense>
  );
}
