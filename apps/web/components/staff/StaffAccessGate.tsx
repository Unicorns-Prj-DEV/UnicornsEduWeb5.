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
    staleTime: 60_000,
  });

  const roleType = data?.roleType;
  const staffRoles = data?.staffInfo?.roles ?? [];
  const hasStaffProfile = Boolean(data?.staffInfo?.id);
  const isStaffOrAdmin = roleType === "staff" || roleType === "admin";
  const isTeacher = staffRoles.includes("teacher");
  const isCustomerCare = staffRoles.includes("customer_care");
  const isAssistant = staffRoles.includes("assistant");
  const isAccountant = staffRoles.includes("accountant");
  const isCommunication = staffRoles.includes("communication");
  const isAssistantStaff = roleType === "staff" && hasStaffProfile && isAssistant;
  const isLessonPlanner =
    staffRoles.includes("lesson_plan") || staffRoles.includes("lesson_plan_head");
  const isLessonPlanParticipant =
    staffRoles.includes("lesson_plan") &&
    !staffRoles.includes("lesson_plan_head");
  const isLessonPlanManager =
    roleType === "admin" || isAssistantStaff || staffRoles.includes("lesson_plan_head");
  const isDashboardRoute = pathname === "/staff";
  const isAssistantDashboardRoute = pathname === "/staff/dashboard";
  const isProfileRoute = pathname === "/staff/profile";
  const isAssistantUsersRoute = pathname.startsWith("/staff/users");
  const isAssistantStaffsRoute = pathname.startsWith("/staff/staffs");
  const isAssistantClassesListRoute = pathname === "/staff/classes";
  const isAssistantStudentsRoute = pathname.startsWith("/staff/students");
  const isAssistantCostsRoute = pathname.startsWith("/staff/costs");
  const isAssistantHistoryRoute = pathname.startsWith("/staff/history");
  const isNotesSubjectRoute = pathname.startsWith("/staff/notes-subject");
  const isRootStaffProfileRoute = isDashboardRoute || isProfileRoute;
  const isCustomerCareSelfRoute = pathname.startsWith("/staff/customer-care-detail");
  const isCustomerCareAdminRoute = pathname.startsWith("/staff/customer-care-detail/");
  const isAssistantSelfRoute = pathname.startsWith("/staff/assistant-detail");
  const isAccountantSelfRoute = pathname.startsWith("/staff/accountant-detail");
  const isCommunicationSelfRoute = pathname.startsWith("/staff/communication-detail");
  const isLessonPlanSelfRoute = pathname.startsWith("/staff/lesson-plan-detail");
  const isLessonPlanAdminDetailRoute = pathname.startsWith("/staff/lesson-plan-detail/");
  const isLessonPlanParticipantRoute =
    pathname.startsWith("/staff/lesson-plan-tasks") ||
    pathname.startsWith("/staff/lesson-plan-manage-details");
  const isLessonPlanManagementRoute =
    pathname.startsWith("/staff/lesson-plans") ||
    pathname.startsWith("/staff/lesson-manage-details");
  const isAssistantAdminLikeRoute =
    isAssistantDashboardRoute ||
    isAssistantUsersRoute ||
    isAssistantStaffsRoute ||
    isAssistantClassesListRoute ||
    isAssistantStudentsRoute ||
    isAssistantCostsRoute ||
    isAssistantHistoryRoute ||
    isCustomerCareAdminRoute ||
    isLessonPlanAdminDetailRoute;
  const isAllowed = isDashboardRoute || isProfileRoute || isNotesSubjectRoute
    ? hasStaffProfile && isStaffOrAdmin
    : isAssistantAdminLikeRoute
      ? isAssistantStaff
    : isCustomerCareSelfRoute
      ? isCustomerCareAdminRoute
        ? isAssistantStaff
        : hasStaffProfile && isStaffOrAdmin && isCustomerCare
      : isAssistantSelfRoute
        ? hasStaffProfile && isStaffOrAdmin && (isAssistant || isAssistantStaff)
        : isAccountantSelfRoute
          ? hasStaffProfile && isStaffOrAdmin && (isAccountant || isAssistantStaff)
          : isCommunicationSelfRoute
            ? hasStaffProfile && isStaffOrAdmin && (isCommunication || isAssistantStaff)
            : isLessonPlanParticipantRoute
              ? hasStaffProfile && roleType === "staff" && isLessonPlanParticipant
              : isLessonPlanManagementRoute
                ? hasStaffProfile && isStaffOrAdmin && isLessonPlanManager
                : isLessonPlanSelfRoute
                  ? hasStaffProfile &&
                    isStaffOrAdmin &&
                    (isLessonPlanAdminDetailRoute
                      ? isAssistantStaff
                      : isLessonPlanner || isAssistantStaff)
                  : roleType === "admin" || isAssistantStaff || (roleType === "staff" && isTeacher);

  const lockedLabel = isRootStaffProfileRoute || isNotesSubjectRoute
    ? "Staff Profile Locked"
    : isAssistantAdminLikeRoute
      ? "Assistant Workspace Locked"
    : isCustomerCareSelfRoute
      ? "Customer Care Locked"
      : isAssistantSelfRoute || isAccountantSelfRoute || isCommunicationSelfRoute
        ? "Allowance Locked"
        : isLessonPlanParticipantRoute
          ? "Lesson Plan Task Workspace Locked"
          : isLessonPlanManagementRoute
            ? "Lesson Plan Workspace Locked"
            : isLessonPlanSelfRoute
              ? "Lesson Plan Locked"
              : "Staff Ops Locked";
  const lockedTitle = isRootStaffProfileRoute || isNotesSubjectRoute
    ? "Tài khoản này chưa mở được hồ sơ staff tự phục vụ."
    : isAssistantAdminLikeRoute
      ? "Route này chỉ mở cho staff có role `assistant`."
    : isCustomerCareSelfRoute
      ? "Tài khoản này không dùng được màn CSKH cá nhân."
      : isAssistantSelfRoute
        ? "Tài khoản này không dùng được màn trợ cấp trợ lí cá nhân."
        : isAccountantSelfRoute
          ? "Tài khoản này không dùng được màn trợ cấp kế toán cá nhân."
          : isCommunicationSelfRoute
            ? "Tài khoản này không dùng được màn trợ cấp truyền thông cá nhân."
            : isLessonPlanParticipantRoute
              ? "Tài khoản này không dùng được workspace task giáo án cá nhân."
              : isLessonPlanManagementRoute
                ? "Tài khoản này không dùng được workspace quản lý giáo án."
                : isLessonPlanSelfRoute
                  ? "Tài khoản này không dùng được màn lesson output cá nhân."
                  : "Tài khoản này không dùng được màn vận hành lớp học.";
  const lockedDescription = isRootStaffProfileRoute || isNotesSubjectRoute
    ? "Route `/staff` hiện là hồ sơ của chính nhân sự đang đăng nhập. Nó chỉ mở khi tài khoản có liên kết staff record hợp lệ."
    : isAssistantAdminLikeRoute
      ? "Nhóm route này mirror lại các module quản trị trong staff shell. Nó chỉ mở cho `roleType=staff` có role `assistant`; các staff role khác tiếp tục dùng self-service hoặc workspace chuyên biệt của riêng mình."
    : isCustomerCareSelfRoute
      ? "Màn này chỉ mở khi hồ sơ nhân sự hiện tại có role `customer_care`. Dữ liệu luôn khóa vào đúng hồ sơ đang đăng nhập."
      : isAssistantSelfRoute
        ? "Màn này chỉ mở khi hồ sơ nhân sự hiện tại có role `assistant`. Nó chỉ hiển thị trợ cấp của chính bạn và không cho phép chỉnh sửa."
        : isAccountantSelfRoute
          ? "Màn này chỉ mở khi hồ sơ nhân sự hiện tại có role `accountant`. Nó chỉ hiển thị trợ cấp của chính bạn và không cho phép chỉnh sửa."
          : isCommunicationSelfRoute
            ? "Màn này chỉ mở khi hồ sơ nhân sự hiện tại có role `communication`. Nó chỉ hiển thị trợ cấp của chính bạn và không cho phép chỉnh sửa."
            : isLessonPlanParticipantRoute
              ? "Workspace này chỉ mở cho staff có role `lesson_plan` thông thường. Bạn chỉ xem được các task mình tham gia, xem resource của các task đó, và chỉ thêm output/resource vào đúng các task được gán."
              : isLessonPlanManagementRoute
                ? "Workspace này chỉ mở cho `admin` hoặc staff có role `lesson_plan_head`. Tại đây Trưởng giáo án có toàn quyền điều chỉnh giống admin, nhưng giữ nguyên trong shell `/staff`."
                : isLessonPlanSelfRoute
                  ? "Màn này chỉ mở khi hồ sơ nhân sự hiện tại có role `lesson_plan` hoặc `lesson_plan_head`. Nó chỉ hiển thị lesson output của chính bạn và không cho phép chỉnh sửa."
                  : "Màn này hiện mở cho `admin` hoặc `staff.teacher`. Teacher dùng nó để xem lớp phụ trách và thao tác buổi học; admin có thể truy cập để theo dõi hoặc hỗ trợ vận hành.";

  useEffect(() => {
    if (!isLoading && !isAllowed) {
      router.replace(isAssistantStaff ? "/staff" : isStaffOrAdmin ? "/user-profile" : "/");
    }
  }, [isAllowed, isAssistantStaff, isLoading, isStaffOrAdmin, router]);

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
