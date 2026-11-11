import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { StaffRole } from 'generated/enums';
import { planTrainingHeadRoleChange } from './training-head-role-policy';

const base = {
  actorStaffId: 'HEAD',
  targetStaffId: 'T1',
  targetIsAdminAccount: false,
};

describe('planTrainingHeadRoleChange', () => {
  it('bật/tắt 3 role quản lý được, giữ role khác và thứ tự cũ', () => {
    const result = planTrainingHeadRoleChange({
      ...base,
      targetRoles: [StaffRole.teacher, StaffRole.customer_care],
      requestedRoles: [StaffRole.lesson_plan, StaffRole.training],
    });
    expect(result.nextRoles).toEqual([
      StaffRole.customer_care,
      StaffRole.lesson_plan,
      StaffRole.training,
    ]);
    expect(result.added).toEqual([StaffRole.lesson_plan, StaffRole.training]);
    expect(result.removed).toEqual([StaffRole.teacher]);
  });

  it('không đổi gì thì added/removed rỗng', () => {
    const result = planTrainingHeadRoleChange({
      ...base,
      targetRoles: [StaffRole.sale, StaffRole.teacher],
      requestedRoles: [StaffRole.teacher],
    });
    expect(result.nextRoles).toEqual([StaffRole.sale, StaffRole.teacher]);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it('403 khi payload có role ngoài phạm vi', () => {
    expect(() =>
      planTrainingHeadRoleChange({
        ...base,
        targetRoles: [StaffRole.teacher],
        requestedRoles: [StaffRole.teacher, StaffRole.lesson_plan_head],
      }),
    ).toThrow(ForbiddenException);
  });

  it('chặn tài khoản admin hệ thống dù staff không mang role admin', () => {
    expect(() =>
      planTrainingHeadRoleChange({
        ...base,
        targetIsAdminAccount: true,
        targetRoles: [StaffRole.communication],
        requestedRoles: [StaffRole.teacher],
      }),
    ).toThrow(ForbiddenException);
  });

  it.each([StaffRole.admin, StaffRole.assistant, StaffRole.training_head])(
    '403 khi target có role %s',
    (role) => {
      expect(() =>
        planTrainingHeadRoleChange({
          ...base,
          targetRoles: [role, StaffRole.teacher],
          requestedRoles: [StaffRole.teacher],
        }),
      ).toThrow(ForbiddenException);
    },
  );

  it('403 khi tự chỉnh chính mình', () => {
    expect(() =>
      planTrainingHeadRoleChange({
        actorStaffId: 'HEAD',
        targetStaffId: 'HEAD',
        targetIsAdminAccount: false,
        targetRoles: [StaffRole.teacher],
        requestedRoles: [],
      }),
    ).toThrow(ForbiddenException);
  });

  it('400 khi bỏ hết role', () => {
    expect(() =>
      planTrainingHeadRoleChange({
        ...base,
        targetRoles: [StaffRole.teacher],
        requestedRoles: [],
      }),
    ).toThrow(BadRequestException);
  });
});
