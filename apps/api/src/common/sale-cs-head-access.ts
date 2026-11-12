import { StaffRole } from 'generated/enums';

/**
 * Staff role của **Trưởng phòng Sale & CSKH** (trước đây là Trợ lí, enum
 * `assistant`). Mọi chỗ backend cần nói tới role này — decorator cho phép route,
 * check quyền, redaction, thuế/hoa hồng theo role — đều đi qua hằng số này, để
 * việc đổi tên enum (biên bản họp 12/11/2026) chỉ sửa một chỗ.
 */
export const SALE_CS_HEAD_ROLE = StaffRole.assistant;

/** Nhân sự có mang role Trưởng phòng Sale & CSKH (Trợ lí) hay không. */
export function hasSaleCsHeadAccess(
  roles: readonly string[] | null | undefined,
): boolean {
  return roles?.includes(SALE_CS_HEAD_ROLE) ?? false;
}
