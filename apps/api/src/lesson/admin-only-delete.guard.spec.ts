import { ExecutionContext, ForbiddenException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

import { StaffRole, UserRole } from '../../generated/enums';
import { AdminOnlyDeleteGuard } from './admin-only-delete.guard';

describe('AdminOnlyDeleteGuard', () => {
  const mockPrisma = {
    staffInfo: {
      findUnique: jest.fn(),
    },
  };

  let guard: AdminOnlyDeleteGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new AdminOnlyDeleteGuard(mockPrisma as never);
  });

  function createContext(user: {
    id: string;
    email: string;
    accountHandle: string;
    roleType: UserRole;
  }): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as ExecutionContext;
  }

  it('allows linked staff.admin to delete even when primary role is student', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      roles: [StaffRole.admin],
    });

    await expect(
      guard.canActivate(
        createContext({
          id: 'student-staff-admin',
          email: 'student-staff-admin@example.com',
          accountHandle: 'student-staff-admin',
          roleType: UserRole.student,
        }),
      ),
    ).resolves.toBe(true);
  });

  it('rejects linked staff without admin or assistant delete role', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      roles: [StaffRole.lesson_plan_head],
    });

    await expect(
      guard.canActivate(
        createContext({
          id: 'lesson-head',
          email: 'lesson-head@example.com',
          accountHandle: 'lesson-head',
          roleType: UserRole.staff,
        }),
      ),
    ).rejects.toThrow(
      new ForbiddenException(
        'Chỉ admin hoặc trợ lí mới có quyền xóa trong admin workspace.',
      ),
    );
  });
});
