import type { UserInfoDto } from "@/dtos/Auth.dto";
import type { FullProfileDto } from "@/dtos/profile.dto";

export type AdminShellAccess = {
  isAdmin: boolean;
  isAssistant: boolean;
  isAccountant: boolean;
  isCustomerCare: boolean;
  isLessonPlanHead: boolean;
  staffId: string | null;
  staffRoles: string[];
};

export const ACCOUNTANT_VISIBLE_HREFS = new Set([
  "/admin/dashboard",
  "/admin/classes",
  "/admin/staffs",
  "/admin/deductions",
  "/admin/costs",
  "/admin/lesson-plans",
]);

const ACCOUNTANT_ALLOWED_ROUTE_PATTERNS = [
  /^\/admin\/dashboard$/,
  /^\/admin\/classes(?:\/[^/]+)?$/,
  /^\/admin\/staffs(?:\/[^/]+)?$/,
  /^\/admin\/deductions$/,
  /^\/admin\/costs$/,
  /^\/admin\/lesson-plans$/,
  /^\/admin\/accountant_detail$/,
  /^\/admin\/assistant_detail$/,
  /^\/admin\/communication_detail$/,
  /^\/admin\/technical_detail$/,
  /^\/admin\/customer_care_detail\/[^/]+$/,
  /^\/admin\/lesson_plan_detail\/[^/]+$/,
] as const;

export function resolveAdminShellAccess(
  profile?: FullProfileDto | UserInfoDto | null,
): AdminShellAccess {
  const staffRoles = Array.isArray((profile as UserInfoDto | undefined)?.staffRoles)
    ? (profile as UserInfoDto).staffRoles ?? []
    : (profile as FullProfileDto | undefined)?.staffInfo?.roles ?? [];
  const isStaff = profile?.roleType === "staff";
  const hasStaffProfile =
    typeof (profile as UserInfoDto | undefined)?.hasStaffProfile === "boolean"
      ? Boolean((profile as UserInfoDto).hasStaffProfile)
      : Boolean((profile as FullProfileDto | undefined)?.staffInfo?.id);

  return {
    isAdmin: profile?.roleType === "admin",
    isAssistant: isStaff && hasStaffProfile && staffRoles.includes("assistant"),
    isAccountant: isStaff && hasStaffProfile && staffRoles.includes("accountant"),
    isCustomerCare: isStaff && hasStaffProfile && staffRoles.includes("customer_care"),
    isLessonPlanHead:
      isStaff && hasStaffProfile && staffRoles.includes("lesson_plan_head"),
    staffId:
      (profile as FullProfileDto | undefined)?.staffInfo?.id ??
      (hasStaffProfile ? "linked" : null),
    staffRoles,
  };
}

export function isAccountantAllowedAdminRoute(pathname: string): boolean {
  return ACCOUNTANT_ALLOWED_ROUTE_PATTERNS.some((pattern) =>
    pattern.test(pathname),
  );
}
