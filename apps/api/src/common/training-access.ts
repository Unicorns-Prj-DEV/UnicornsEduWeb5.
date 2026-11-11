import { StaffRole } from 'generated/enums';

/**
 * Staff role mang quyền truy cập của **Ban Đào Tạo** (CONTEXT.md): xem hồ sơ
 * gia sư, lịch chế độ đào tạo, phạm vi lớp quản lý, dashboard section đào tạo…
 *
 * Chỉ dùng cho check *quyền*. Check theo *thu nhập của role* (extra allowance,
 * lương cứng, dòng Công việc khác) vẫn so đúng role cụ thể, không đi qua đây.
 */
export const TRAINING_ACCESS_ROLES: readonly StaffRole[] = [StaffRole.training];

export function hasTrainingAccess(
  roles: readonly string[] | null | undefined,
): boolean {
  if (!roles?.length) return false;
  return TRAINING_ACCESS_ROLES.some((role) => roles.includes(role));
}
