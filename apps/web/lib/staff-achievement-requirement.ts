/** Nhân sự có role này bắt buộc có ít nhất 1 thành tích (khớp `hasRequiredStaffAchievements` ở API). */
export const ACHIEVEMENT_REQUIRED_STAFF_ROLE = "teacher";

type StaffAchievementRequirementInput = {
  roles?: string[] | null;
  achievementCount?: number | null;
} | null | undefined;

/**
 * Gia sư chưa có thành tích nào. API cũ không trả `achievementCount` thì không chặn
 * ở client — gate gốc vẫn là `staffProfileComplete` từ API.
 */
export function isMissingRequiredStaffAchievement(
  staffInfo: StaffAchievementRequirementInput,
): boolean {
  if (!staffInfo?.roles?.includes(ACHIEVEMENT_REQUIRED_STAFF_ROLE)) {
    return false;
  }
  return (
    typeof staffInfo.achievementCount === "number" &&
    staffInfo.achievementCount < 1
  );
}
