jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

import { StaffRole, UserRole } from '../../generated/enums';
import { AuthAccessService } from './auth-access.service';

describe('AuthAccessService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };
  const authIdentityCacheService = {
    getAuthIdentity: jest.fn(),
    getStaffRoles: jest.fn(),
  };

  let service: AuthAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthAccessService(
      prisma as never,
      authIdentityCacheService as never,
    );
  });

  it('unions primary, linked staff, linked student, and full admin access', async () => {
    prisma.user.findUnique.mockResolvedValue({
      staffInfo: {
        id: 'staff-1',
        cccdNumber: '012345678901',
        cccdIssuedDate: new Date('2026-01-01T00:00:00.000Z'),
        cccdIssuedPlace: 'Ha Noi',
        birthDate: new Date('2000-01-01T00:00:00.000Z'),
        university: 'UE University',
        highSchool: 'UE High',
        specialization: 'Math',
        bankAccount: '123456789',
        bankQrLink: 'qr-link',
        cccdFrontPath: 'front.png',
        cccdBackPath: 'back.png',
      },
      studentInfo: { id: 'student-1' },
    });
    authIdentityCacheService.getStaffRoles.mockResolvedValue([StaffRole.admin]);

    await expect(
      service.resolveForIdentity({
        id: 'user-1',
        email: 'overlap@example.com',
        accountHandle: 'overlap',
        roleType: UserRole.student,
        status: 'active',
        emailVerified: true,
        avatarPath: null,
        requiresPasswordSetup: false,
      }),
    ).resolves.toEqual({
      effectiveRoleTypes: [UserRole.student, UserRole.staff, UserRole.admin],
      staffRoles: [StaffRole.admin],
      hasStaffProfile: true,
      hasStudentProfile: true,
      staffProfileComplete: true,
      availableWorkspaces: ['admin', 'staff', 'student'],
      defaultWorkspace: 'student',
      preferredRedirect: '/student',
      access: {
        admin: { canAccess: true, tier: 'full' },
        staff: { canAccess: true, profileComplete: true },
        student: { canAccess: true },
      },
    });
    expect(authIdentityCacheService.getStaffRoles).toHaveBeenCalledWith(
      'user-1',
      undefined,
    );
  });

  it('uses staff as the login landing workspace for non-admin staff roles', async () => {
    prisma.user.findUnique.mockResolvedValue({
      staffInfo: {
        id: 'staff-2',
        cccdNumber: '012345678901',
        cccdIssuedDate: new Date('2026-01-01T00:00:00.000Z'),
        cccdIssuedPlace: 'Ha Noi',
        birthDate: new Date('2000-01-01T00:00:00.000Z'),
        university: 'UE University',
        highSchool: 'UE High',
        specialization: 'Accounting',
        bankAccount: '123456789',
        bankQrLink: 'qr-link',
        cccdFrontPath: 'front.png',
        cccdBackPath: 'back.png',
      },
      studentInfo: null,
    });
    authIdentityCacheService.getStaffRoles.mockResolvedValue([
      StaffRole.accountant,
    ]);

    await expect(
      service.resolveForIdentity({
        id: 'user-2',
        email: 'accountant@example.com',
        accountHandle: 'accountant',
        roleType: UserRole.staff,
        status: 'active',
        emailVerified: true,
        avatarPath: null,
        requiresPasswordSetup: false,
      }),
    ).resolves.toMatchObject({
      effectiveRoleTypes: [UserRole.staff],
      staffRoles: [StaffRole.accountant],
      hasStaffProfile: true,
      hasStudentProfile: false,
      availableWorkspaces: ['admin', 'staff'],
      defaultWorkspace: 'staff',
      preferredRedirect: '/staff',
      access: {
        admin: { canAccess: true, tier: 'accountant' },
        staff: { canAccess: true, profileComplete: true },
        student: { canAccess: false },
      },
    });
  });

  it('does not grant staff workspace from primary role alone without a staff profile', async () => {
    prisma.user.findUnique.mockResolvedValue({
      staffInfo: null,
      studentInfo: { id: 'student-1' },
    });

    await expect(
      service.resolveForIdentity({
        id: 'user-2',
        email: 'staff-without-profile@example.com',
        accountHandle: 'staff-without-profile',
        roleType: UserRole.staff,
        status: 'active',
        emailVerified: true,
        avatarPath: null,
        requiresPasswordSetup: false,
      }),
    ).resolves.toMatchObject({
      effectiveRoleTypes: [UserRole.staff, UserRole.student],
      staffRoles: [],
      hasStaffProfile: false,
      hasStudentProfile: true,
      availableWorkspaces: ['student'],
      defaultWorkspace: 'student',
      preferredRedirect: '/student',
      access: {
        admin: { canAccess: false, tier: null },
        staff: { canAccess: false, profileComplete: false },
        student: { canAccess: true },
      },
    });
    expect(authIdentityCacheService.getStaffRoles).not.toHaveBeenCalled();
  });
});
