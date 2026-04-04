"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFullProfile } from "@/lib/apis/auth.api";
import { resolveStaffLessonWorkspace } from "@/lib/staff-lesson-workspace";

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
  const lessonWorkspace = resolveStaffLessonWorkspace(data);
  const isLessonPlanner =
    staffRoles.includes("lesson_plan") || staffRoles.includes("lesson_plan_head");
  const isDashboardRoute = pathname === "/staff";
  const isAssistantDashboardRoute = pathname === "/staff/dashboard";
  const isProfileRoute = pathname === "/staff/profile";
  const isAssistantUsersRoute = pathname.startsWith("/staff/users");
  const isAssistantStaffsRoute = pathname.startsWith("/staff/staffs");
  const isStaffClassesRoute = pathname.startsWith("/staff/classes");
  const isStaffClassDetailRoute = pathname.startsWith("/staff/classes/");
  const isStaffCostsRoute = pathname.startsWith("/staff/costs");
  const isStaffStudentsRoute = pathname.startsWith("/staff/students");
  const isStaffStudentsListRoute = pathname === "/staff/students";
  const isStaffStudentDetailRoute = pathname.startsWith("/staff/students/");
  const isAssistantHistoryRoute = pathname.startsWith("/staff/history");
  const isStaffNotificationRoute = pathname.startsWith("/staff/notification");
  const isNotesSubjectRoute = pathname.startsWith("/staff/notes-subject");
  const isRootStaffProfileRoute = isDashboardRoute || isProfileRoute;
  const isCustomerCareSelfRoute = pathname.startsWith("/staff/customer-care-detail");
  const isCustomerCareAdminRoute = pathname.startsWith("/staff/customer-care-detail/");
  const isAssistantSelfRoute = pathname.startsWith("/staff/assistant-detail");
  const isAccountantSelfRoute = pathname.startsWith("/staff/accountant-detail");
  const isCommunicationSelfRoute = pathname.startsWith("/staff/communication-detail");
  const isLessonPlanSelfRoute =
    pathname.startsWith("/staff/lesson-plan-detail") ||
    pathname.startsWith("/staff/lesson_plan_detail");
  const isLessonPlanAdminDetailRoute =
    pathname.startsWith("/staff/lesson-plan-detail/") ||
    pathname.startsWith("/staff/lesson_plan_detail/");
  const isLessonPlanLegacyRoute =
    pathname.startsWith("/staff/lesson-plan-tasks") ||
    pathname.startsWith("/staff/lesson-plan-manage-details");
  const isStaffLessonPlansHomeRoute = pathname === "/staff/lesson-plans";
  const isStaffLessonPlansTaskDetailRoute = pathname.startsWith("/staff/lesson-plans/tasks/");
  const isLessonPlanManageDetailsRoute = pathname.startsWith("/staff/lesson-manage-details");
  const isAssistantAdminLikeRoute =
    isAssistantDashboardRoute ||
    isAssistantUsersRoute ||
    isAssistantStaffsRoute ||
    isStaffStudentsListRoute ||
    isAssistantHistoryRoute ||
    isCustomerCareAdminRoute ||
    isLessonPlanAdminDetailRoute;
  const isAllowed = isDashboardRoute || isProfileRoute || isNotesSubjectRoute || isStaffNotificationRoute
    ? hasStaffProfile && isStaffOrAdmin
    : isStaffClassesRoute
      ? isAssistantStaff ||
        (hasStaffProfile && isStaffOrAdmin && isAccountant) ||
        (isStaffClassDetailRoute &&
          ((hasStaffProfile && roleType === "admin") ||
            (hasStaffProfile && roleType === "staff" && (isTeacher || isCustomerCare))))
    : isStaffStudentsRoute
      ? isAssistantStaff ||
        (isStaffStudentDetailRoute &&
          hasStaffProfile &&
          roleType === "staff" &&
          isCustomerCare)
    : isStaffCostsRoute
      ? isAssistantStaff || (hasStaffProfile && isStaffOrAdmin && isAccountant)
    : isStaffLessonPlansHomeRoute
      ? hasStaffProfile && isStaffOrAdmin && lessonWorkspace.canAccessWorkspace
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
            : isLessonPlanLegacyRoute
              ? hasStaffProfile && isStaffOrAdmin && lessonWorkspace.canAccessWorkspace
              : isStaffLessonPlansTaskDetailRoute
                ? hasStaffProfile && isStaffOrAdmin && lessonWorkspace.canAccessTaskDetail
                : isLessonPlanManageDetailsRoute
                  ? hasStaffProfile && isStaffOrAdmin && lessonWorkspace.canAccessManageDetails
                : isLessonPlanSelfRoute
                  ? hasStaffProfile &&
                    isStaffOrAdmin &&
                    (isLessonPlanAdminDetailRoute
                      ? isAssistantStaff
                      : isLessonPlanner || isAssistantStaff)
                  : roleType === "admin" || isAssistantStaff || (roleType === "staff" && isTeacher);

  const lockedLabel = isRootStaffProfileRoute || isNotesSubjectRoute || isStaffNotificationRoute
    ? "Staff Profile Locked"
    : isStaffClassesRoute
      ? "Class Workspace Locked"
    : isStaffStudentsRoute
      ? "Student Detail Locked"
    : isStaffCostsRoute
      ? "Cost Workspace Locked"
    : isAssistantAdminLikeRoute
      ? "Assistant Workspace Locked"
    : isCustomerCareSelfRoute
      ? "Customer Care Locked"
      : isAssistantSelfRoute || isAccountantSelfRoute || isCommunicationSelfRoute
        ? "Allowance Locked"
        : isLessonPlanLegacyRoute || isStaffLessonPlansTaskDetailRoute || isLessonPlanManageDetailsRoute || isStaffLessonPlansHomeRoute
            ? "Lesson Plan Workspace Locked"
            : isLessonPlanSelfRoute
              ? "Lesson Plan Locked"
              : "Staff Ops Locked";
  const lockedTitle = isRootStaffProfileRoute || isNotesSubjectRoute
    ? "Tài khoản này chưa mở được hồ sơ staff tự phục vụ."
    : isStaffNotificationRoute
      ? "Tài khoản này không dùng được feed thông báo staff."
    : isStaffClassesRoute
      ? "Tài khoản này không dùng được màn lớp học trong staff shell."
    : isStaffStudentsRoute
      ? "Tài khoản này không dùng được màn chi tiết học sinh trong staff shell."
    : isStaffCostsRoute
      ? "Tài khoản này không dùng được màn chi phí trong staff shell."
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
            : isLessonPlanLegacyRoute
              ? "Tài khoản này không dùng được route giáo án cũ."
              : isStaffLessonPlansTaskDetailRoute
                ? "Tài khoản này không dùng được route chi tiết công việc giáo án."
                : isLessonPlanManageDetailsRoute || isStaffLessonPlansHomeRoute
                  ? "Tài khoản này không dùng được workspace giáo án."
                : isLessonPlanSelfRoute
                  ? "Tài khoản này không dùng được màn lesson output cá nhân."
                  : "Tài khoản này không dùng được màn vận hành lớp học.";
  const lockedDescription = isRootStaffProfileRoute || isNotesSubjectRoute
    ? "Route `/staff` hiện là hồ sơ của chính nhân sự đang đăng nhập. Nó chỉ mở khi tài khoản có liên kết staff record hợp lệ."
    : isStaffNotificationRoute
      ? "Route `/staff/notification` chỉ mở khi tài khoản có linked staff profile hợp lệ. Đây là feed chỉ đọc dành cho nhân sự xem các thông báo admin đã push."
    : isStaffClassesRoute
      ? "Route `/staff/classes` hiện mở danh sách cho `staff.assistant` và `staff.accountant`; riêng `staff.teacher`, `admin`, và `staff.customer_care` chỉ mở trực tiếp trang chi tiết `/staff/classes/[id]`. Với customer care, backend tiếp tục khóa theo các lớp có ít nhất một học sinh đang do chính staff đó phụ trách."
    : isStaffStudentsRoute
      ? "Route `/staff/students` hiện mở danh sách cho `staff.assistant`; riêng `staff.customer_care` chỉ mở trực tiếp trang chi tiết `/staff/students/[id]` và backend sẽ khóa học sinh vào đúng hồ sơ CSKH hiện tại."
    : isStaffCostsRoute
      ? "Route `/staff/costs` hiện mở cho `staff.assistant` và `staff.accountant`. Kế toán dùng admin-like cost workspace trong staff shell, nhưng các action tạo mới/xóa vẫn bị khóa theo policy accountant."
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
            : isLessonPlanLegacyRoute
              ? "Các route legacy `/staff/lesson-plan-tasks*` đã được gộp vào `/staff/lesson-plans`. Workspace mới mở cho `admin`, `staff.assistant`, `staff.lesson_plan_head`, `staff.lesson_plan`, và `staff.accountant`, nhưng mỗi role chỉ thấy đúng các tab và route detail được backend cho phép."
              : isStaffLessonPlansTaskDetailRoute
                ? "Route `/staff/lesson-plans/tasks/[taskId]` mở cho `lesson_plan`, `lesson_plan_head`, `admin`, và `staff.assistant`. Accountant chỉ dùng tab `Công việc`, không mở route task detail."
                : isLessonPlanManageDetailsRoute || isStaffLessonPlansHomeRoute
                  ? "Workspace `/staff/lesson-plans` là entrypoint chung cho lesson module trong staff shell. `lesson_plan_head` thấy 3 tab `Tổng quan / Công việc / Giáo Án`; `lesson_plan` chỉ thấy `Tổng quan / Công việc` và dữ liệu cá nhân; `accountant` chỉ thấy tab `Công việc` với toàn bộ lesson output."
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
