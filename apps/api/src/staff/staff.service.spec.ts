jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));
jest.mock('../../generated/client', () => ({
  Prisma: {},
}));

import { StaffRole, UserRole } from '../../generated/enums';
import { StaffService } from './staff.service';

describe('StaffService', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    staffInfo: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    classTeacher: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  const actionHistoryService = {
    recordCreate: jest.fn(),
    recordUpdate: jest.fn(),
    recordDelete: jest.fn(),
  };

  let service: StaffService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      (callback: (db: typeof mockPrisma) => unknown) => callback(mockPrisma),
    );
    service = new StaffService(
      mockPrisma as never,
      actionHistoryService as never,
    );
  });

  it('records action history after creating a staff profile', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      roleType: UserRole.guest,
      staffInfo: null,
    });
    mockPrisma.staffInfo.create.mockResolvedValue({
      id: 'staff-1',
      fullName: 'Teacher A',
      birthDate: new Date('2000-01-01T00:00:00.000Z'),
      university: 'HCMUS',
      highSchool: 'LHP',
      specialization: 'Math',
      bankAccount: '123',
      bankQrLink: 'qr',
      roles: [StaffRole.teacher],
      userId: 'user-1',
      status: 'active',
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-20T10:00:00.000Z'),
    });
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      id: 'staff-1',
      fullName: 'Teacher A',
      birthDate: new Date('2000-01-01T00:00:00.000Z'),
      university: 'HCMUS',
      highSchool: 'LHP',
      specialization: 'Math',
      bankAccount: '123',
      bankQrLink: 'qr',
      roles: [StaffRole.teacher],
      userId: 'user-1',
      status: 'active',
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-20T10:00:00.000Z'),
      user: {
        id: 'user-1',
        email: 'teacher@example.com',
        accountHandle: 'teacher',
        phone: null,
        first_name: 'Teacher',
        last_name: 'A',
        province: 'Hanoi',
        roleType: UserRole.staff,
        status: 'active',
        emailVerified: true,
        phoneVerified: false,
        linkId: null,
      },
      classTeachers: [],
    });

    await service.createStaff(
      {
        full_name: 'Teacher A',
        birth_date: '2000-01-01',
        university: 'HCMUS',
        high_school: 'LHP',
        specialization: 'Math',
        bank_account: '123',
        bank_qr_link: 'qr',
        roles: [StaffRole.teacher],
        user_id: 'user-1',
      },
      {
        userId: 'admin-1',
        userEmail: 'admin@example.com',
        roleType: 'admin',
      },
    );

    expect(actionHistoryService.recordCreate).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        entityType: 'staff',
        entityId: 'staff-1',
      }),
    );
  });
});
