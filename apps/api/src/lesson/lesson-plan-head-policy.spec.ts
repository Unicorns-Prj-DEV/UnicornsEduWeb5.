jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { StaffRole } from '../../generated/enums';
import { LessonController } from './lesson.controller';
import { LessonManagementGuard } from './lesson-management.guard';
import {
  assertCanDeleteLessonWork,
  assertCanSetLessonOutputPricing,
  canDeleteLessonWork,
  canEditLessonOutputPaymentStatus,
  canViewLessonOutputCost,
  redactLessonOutputCost,
  type LessonPolicyActor,
} from './lesson-plan-head-policy';

const admin: LessonPolicyActor = {
  staffId: null,
  staffRoles: [StaffRole.admin],
  canManage: true,
};
const head: LessonPolicyActor = {
  staffId: 'staff-head',
  staffRoles: [StaffRole.lesson_plan_head],
  canManage: true,
};
const planner: LessonPolicyActor = {
  staffId: 'staff-planner',
  staffRoles: [StaffRole.lesson_plan],
  canManage: false,
};
const expenseAccountant: LessonPolicyActor = {
  staffId: 'staff-acc',
  staffRoles: [StaffRole.accountant_expense],
  canManage: false,
};

describe('lesson-plan-head-policy (#279)', () => {
  describe('xoá đầu việc / sản phẩm / tài liệu', () => {
    it('Admin và Trưởng ban Chuyên môn được xoá', () => {
      expect(canDeleteLessonWork(admin)).toBe(true);
      expect(canDeleteLessonWork(head)).toBe(true);
      expect(() => assertCanDeleteLessonWork(head)).not.toThrow();
    });

    it('Ban Chuyên môn thường và Kế toán chi bị từ chối', () => {
      expect(canDeleteLessonWork(planner)).toBe(false);
      expect(() => assertCanDeleteLessonWork(planner)).toThrow(
        ForbiddenException,
      );
      expect(() => assertCanDeleteLessonWork(expenseAccountant)).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('trạng thái thanh toán', () => {
    it('chỉ Admin và Kế toán chi sửa', () => {
      expect(canEditLessonOutputPaymentStatus(admin)).toBe(true);
      expect(canEditLessonOutputPaymentStatus(expenseAccountant)).toBe(true);
    });

    it('Trưởng ban Chuyên môn và Ban Chuyên môn thường bị từ chối', () => {
      expect(canEditLessonOutputPaymentStatus(head)).toBe(false);
      expect(canEditLessonOutputPaymentStatus(planner)).toBe(false);
    });
  });

  describe('chi phí từng sản phẩm', () => {
    it('Trưởng ban, Admin, Kế toán chi thấy chi phí của mọi người', () => {
      expect(canViewLessonOutputCost(head, 'staff-other')).toBe(true);
      expect(canViewLessonOutputCost(admin, 'staff-other')).toBe(true);
      expect(canViewLessonOutputCost(expenseAccountant, 'staff-other')).toBe(
        true,
      );
    });

    it('Ban Chuyên môn thường chỉ thấy chi phí của chính mình', () => {
      expect(canViewLessonOutputCost(planner, 'staff-planner')).toBe(true);
      expect(canViewLessonOutputCost(planner, 'staff-other')).toBe(false);
      expect(canViewLessonOutputCost(planner, null)).toBe(false);
      expect(
        redactLessonOutputCost(
          { cost: 30000, staffId: 'staff-other' },
          planner,
        ),
      ).toEqual({ cost: null, staffId: 'staff-other' });
      expect(
        redactLessonOutputCost(
          { cost: 30000, staffId: 'staff-planner' },
          planner,
        ),
      ).toEqual({ cost: 30000, staffId: 'staff-planner' });
    });
  });

  describe('cài đặt bậc độ khó / level / hạng mục', () => {
    it('Admin cài được cho mọi sản phẩm', () => {
      expect(() => assertCanSetLessonOutputPricing(admin, null)).not.toThrow();
    });

    it('Trưởng ban cài được cho sản phẩm của người khác', () => {
      expect(() =>
        assertCanSetLessonOutputPricing(head, 'staff-other'),
      ).not.toThrow();
      expect(() => assertCanSetLessonOutputPricing(head, null)).not.toThrow();
    });

    it('Trưởng ban không tự cài cho sản phẩm của chính mình', () => {
      expect(() => assertCanSetLessonOutputPricing(head, 'staff-head')).toThrow(
        ForbiddenException,
      );
    });

    it('Ban Chuyên môn thường không cài', () => {
      expect(() =>
        assertCanSetLessonOutputPricing(planner, 'staff-other'),
      ).toThrow(ForbiddenException);
      expect(() =>
        assertCanSetLessonOutputPricing(planner, 'staff-planner'),
      ).toThrow(ForbiddenException);
    });
  });

  describe('route xoá đầu việc / sản phẩm', () => {
    it.each(['deleteTask', 'deleteOutput'] as const)(
      'LessonController.%s chỉ qua LessonManagementGuard (Admin + Trưởng ban Chuyên môn)',
      (methodName) => {
        const guards = Reflect.getMetadata(
          GUARDS_METADATA,
          LessonController.prototype[methodName],
        ) as unknown[];
        expect(guards).toEqual([LessonManagementGuard]);
      },
    );
  });
});
