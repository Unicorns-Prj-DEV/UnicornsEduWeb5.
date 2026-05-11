import { ExecutionContext, ForbiddenException } from '@nestjs/common';

import { StaffRole, UserRole } from '../../../generated/enums';
import { VerifiedEmailGuard } from './verified-email.guard';

describe('VerifiedEmailGuard', () => {
  const authIdentityCacheService = {
    getStaffRoles: jest.fn(),
  };
  const guard = new VerifiedEmailGuard(authIdentityCacheService as never);

  function createContext(user: {
    id?: string;
    roleType: UserRole;
    emailVerified?: boolean;
  }): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    authIdentityCacheService.getStaffRoles.mockResolvedValue([]);
  });

  it('allows admin even when email is not verified', async () => {
    await expect(
      guard.canActivate(
        createContext({
          roleType: UserRole.admin,
          emailVerified: false,
        }),
      ),
    ).resolves.toBe(true);
  });

  it('allows staff admin even when email is not verified', async () => {
    authIdentityCacheService.getStaffRoles.mockResolvedValue([StaffRole.admin]);

    await expect(
      guard.canActivate(
        createContext({
          id: 'staff-admin-1',
          roleType: UserRole.staff,
          emailVerified: false,
        }),
      ),
    ).resolves.toBe(true);
  });

  it('rejects non-admin users with unverified email', async () => {
    await expect(
      guard.canActivate(
        createContext({
          id: 'staff-1',
          roleType: UserRole.staff,
          emailVerified: false,
        }),
      ),
    ).rejects.toThrow(
      new ForbiddenException(
        'Vui lòng xác minh email trước khi truy cập tính năng này.',
      ),
    );
  });
});
