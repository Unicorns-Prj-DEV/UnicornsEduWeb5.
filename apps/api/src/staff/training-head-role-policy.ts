import { SALE_CS_HEAD_ROLE } from 'src/common/sale-cs-head-access';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { StaffRole } from 'generated/enums';

/**
 * Role Trưởng Ban Đào Tạo được bật/tắt cho nhân sự khác (CONTEXT.md «Chỉnh role
 * nhân sự (Trưởng Ban Đào Tạo)»). Mọi role khác chỉ đọc và được giữ nguyên.
 */
export const TRAINING_HEAD_MANAGEABLE_ROLES: readonly StaffRole[] = [
  StaffRole.teacher,
  StaffRole.lesson_plan,
  StaffRole.training,
];

/** Nhân sự mang một trong các role này không bị Trưởng ban chỉnh role. */
export const TRAINING_HEAD_PROTECTED_TARGET_ROLES: readonly StaffRole[] = [
  StaffRole.admin,
  SALE_CS_HEAD_ROLE,
  StaffRole.training_head,
];

/**
 * Tính danh sách role mới khi Trưởng ban gửi tập role quản lý được mong muốn.
 * `requestedRoles` là trạng thái đích của 3 role quản lý được; role khác của
 * target giữ nguyên thứ tự cũ.
 */
export function planTrainingHeadRoleChange(params: {
  actorStaffId: string;
  targetStaffId: string;
  targetRoles: readonly StaffRole[];
  /** `users.role_type = admin`: tài khoản admin hệ thống, có thể không mang `StaffRole.admin`. */
  targetIsAdminAccount: boolean;
  requestedRoles: readonly StaffRole[];
}): { nextRoles: StaffRole[]; added: StaffRole[]; removed: StaffRole[] } {
  if (params.actorStaffId === params.targetStaffId) {
    throw new ForbiddenException('Không thể tự chỉnh role của chính mình.');
  }
  if (
    params.targetIsAdminAccount ||
    params.targetRoles.some((role) =>
      TRAINING_HEAD_PROTECTED_TARGET_ROLES.includes(role),
    )
  ) {
    throw new ForbiddenException(
      'Không được chỉnh role của admin, trợ lí hoặc Trưởng ban đào tạo.',
    );
  }
  const outOfScope = params.requestedRoles.filter(
    (role) => !TRAINING_HEAD_MANAGEABLE_ROLES.includes(role),
  );
  if (outOfScope.length > 0) {
    throw new ForbiddenException(
      'Trưởng ban đào tạo chỉ được bật/tắt role gia sư, chuyên môn, đào tạo.',
    );
  }

  const requested = new Set(params.requestedRoles);
  const kept = params.targetRoles.filter(
    (role) =>
      !TRAINING_HEAD_MANAGEABLE_ROLES.includes(role) || requested.has(role),
  );
  const added = TRAINING_HEAD_MANAGEABLE_ROLES.filter(
    (role) => requested.has(role) && !params.targetRoles.includes(role),
  );
  const nextRoles = [...kept, ...added];
  if (nextRoles.length === 0) {
    throw new BadRequestException('Nhân sự phải còn ít nhất một role.');
  }

  return {
    nextRoles,
    added,
    removed: params.targetRoles.filter((role) => !nextRoles.includes(role)),
  };
}
