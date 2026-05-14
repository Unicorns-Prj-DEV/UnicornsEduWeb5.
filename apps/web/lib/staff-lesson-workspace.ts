import { Role, type UserInfoDto } from "@/dtos/Auth.dto";
import type { FullProfileDto } from "@/dtos/profile.dto";

export type StaffLessonWorkspacePolicy =
  | "admin"
  | "lesson_plan_head"
  | "lesson_plan"
  | "accountant";

export type StaffLessonEndpointAccessMode =
  | "manage"
  | "account"
  | "participant";

export type StaffLessonWorkspaceAccess = {
  workspacePolicy: StaffLessonWorkspacePolicy | null;
  participantMode: boolean;
  canAccessWorkspace: boolean;
  canAccessTaskDetail: boolean;
  canAccessManageDetails: boolean;
  workAccessMode: StaffLessonEndpointAccessMode | null;
  createOutputAccessMode: Exclude<StaffLessonEndpointAccessMode, "account"> | null;
  isAssistant: boolean;
  isAccountant: boolean;
  isLessonPlan: boolean;
  isLessonPlanHead: boolean;
};

export function resolveStaffLessonWorkspace(
  profile?: FullProfileDto | UserInfoDto | null,
): StaffLessonWorkspaceAccess {
  const staffRoles = Array.isArray((profile as UserInfoDto | undefined)?.staffRoles)
    ? (profile as UserInfoDto).staffRoles ?? []
    : (profile as FullProfileDto | undefined)?.staffInfo?.roles ?? [];
  const effectiveRoleTypes =
    (profile as UserInfoDto | undefined)?.effectiveRoleTypes ?? [];
  const hasStaffProfile =
    typeof (profile as UserInfoDto | undefined)?.hasStaffProfile === "boolean"
      ? Boolean((profile as UserInfoDto).hasStaffProfile)
      : Boolean((profile as FullProfileDto | undefined)?.staffInfo?.id);
  const isAdmin =
    profile?.roleType === "admin" ||
    staffRoles.includes("admin") ||
    (profile as UserInfoDto | undefined)?.access?.admin?.tier === "full";
  const isStaff =
    profile?.roleType === "staff" ||
    effectiveRoleTypes.includes(Role.staff) ||
    (hasStaffProfile && profile?.roleType !== "guest");
  const isAssistant = isStaff && staffRoles.includes("assistant");
  const isLessonPlanHead = isStaff && staffRoles.includes("lesson_plan_head");
  const isLessonPlan = isStaff && staffRoles.includes("lesson_plan");
  const isAccountant = isStaff && staffRoles.includes("accountant");

  const workspacePolicy: StaffLessonWorkspacePolicy | null = isAdmin || isAssistant
    ? "admin"
    : isLessonPlanHead
      ? "lesson_plan_head"
      : isLessonPlan
        ? "lesson_plan"
        : isAccountant
          ? "accountant"
          : null;
  const workAccessMode: StaffLessonEndpointAccessMode | null =
    isAdmin || isAssistant || isLessonPlanHead
      ? "manage"
      : isAccountant
        ? "account"
        : isLessonPlan
          ? "participant"
          : null;
  const createOutputAccessMode: Exclude<
    StaffLessonEndpointAccessMode,
    "account"
  > | null =
    isAdmin || isAssistant || isLessonPlanHead
      ? "manage"
      : isLessonPlan
        ? "participant"
        : null;

  return {
    workspacePolicy,
    participantMode: workspacePolicy === "lesson_plan",
    canAccessWorkspace: workspacePolicy !== null,
    canAccessTaskDetail:
      workspacePolicy === "admin" ||
      workspacePolicy === "lesson_plan_head" ||
      workspacePolicy === "lesson_plan",
    canAccessManageDetails:
      workspacePolicy === "admin" || workspacePolicy === "lesson_plan_head",
    workAccessMode,
    createOutputAccessMode,
    isAssistant,
    isAccountant,
    isLessonPlan,
    isLessonPlanHead,
  };
}
