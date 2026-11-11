/**
 * Chỉnh role nhân sự bởi Trưởng Ban Đào Tạo (CONTEXT.md). Khớp
 * `training-head-role-policy.ts` ở backend; backend vẫn là nơi chặn cuối.
 */
export const TRAINING_HEAD_MANAGEABLE_ROLES = [
  "teacher",
  "lesson_plan",
  "training",
] as const;

export type TrainingHeadManageableRole =
  (typeof TRAINING_HEAD_MANAGEABLE_ROLES)[number];

/** Nhân sự mang role này không bị Trưởng ban chỉnh role. */
export const TRAINING_HEAD_PROTECTED_TARGET_ROLES = [
  "admin",
  "assistant",
  "training_head",
] as const;

export function isTrainingHeadManageableRole(
  role: string,
): role is TrainingHeadManageableRole {
  return (TRAINING_HEAD_MANAGEABLE_ROLES as readonly string[]).includes(role);
}

/** Hiện nút «Sửa role» khi người xem là Trưởng ban và target hợp lệ. */
export function canTrainingHeadEditRoles(params: {
  viewerStaffId: string | null | undefined;
  viewerRoles: readonly string[] | null | undefined;
  target: { id: string; roles: readonly string[] };
}): boolean {
  const { viewerStaffId, viewerRoles, target } = params;
  if (!viewerStaffId || !viewerRoles?.includes("training_head")) return false;
  if (viewerStaffId === target.id) return false;
  return !target.roles.some((role) =>
    (TRAINING_HEAD_PROTECTED_TARGET_ROLES as readonly string[]).includes(role),
  );
}

/** Role ngoài phạm vi chỉnh: chỉ hiển thị, giữ nguyên khi lưu. */
export function getReadOnlyRoles(roles: readonly string[]): string[] {
  return roles.filter((role) => !isTrainingHeadManageableRole(role));
}

export function getManageableRoles(
  roles: readonly string[],
): TrainingHeadManageableRole[] {
  return TRAINING_HEAD_MANAGEABLE_ROLES.filter((role) => roles.includes(role));
}

/** Kết quả sau lưu còn ít nhất một role (backend trả 400 nếu không). */
export function hasAnyRoleAfterChange(
  currentRoles: readonly string[],
  selected: readonly string[],
): boolean {
  return getReadOnlyRoles(currentRoles).length > 0 || selected.length > 0;
}
