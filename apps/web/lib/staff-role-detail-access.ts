import type { FullProfileDto } from "@/dtos/profile.dto";

export function canViewCrossStaffRoleDetail(
  profile: FullProfileDto | null | undefined,
  staffId: string | null | undefined,
): boolean {
  if (!staffId?.trim()) {
    return false;
  }

  if (profile?.roleType === "admin") {
    return true;
  }

  if (profile?.roleType !== "staff") {
    return false;
  }

  const roles = profile.staffInfo?.roles ?? [];
  return roles.includes("assistant") || roles.includes("accountant_expense");
}
