jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

import * as bcrypt from 'bcrypt';
import { UserRole } from '../../generated/enums';
import { UserService } from './user.service';

describe('UserService', () => {
  const mockPrisma = {
    user: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    staffInfo: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    studentInfo: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const actionHistoryService = {
    recordCreate: jest.fn(),
    recordUpdate: jest.fn(),
    recordDelete: jest.fn(),
  };

  let service: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      (callback: (db: typeof mockPrisma) => unknown) => callback(mockPrisma),
    );
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    service = new UserService(
      mockPrisma as never,
      actionHistoryService as never,
    );
  });

  it('records action history after creating a user', async () => {
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'new-user@example.com',
      phone: '0123456789',
      passwordHash: 'hashed-password',
      refreshToken: null,
      first_name: 'New',
      last_name: 'User',
      roleType: UserRole.guest,
      province: 'Hanoi',
      accountHandle: 'new-user',
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-20T10:00:00.000Z'),
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'new-user@example.com',
      phone: '0123456789',
      passwordHash: 'hashed-password',
      refreshToken: null,
      first_name: 'New',
      last_name: 'User',
      roleType: UserRole.guest,
      province: 'Hanoi',
      accountHandle: 'new-user',
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-20T10:00:00.000Z'),
      staffInfo: null,
      studentInfo: null,
    });

    await service.createUser(
      {
        email: 'new-user@example.com',
        phone: '0123456789',
        password: 'secret',
        first_name: 'New',
        last_name: 'User',
        province: 'Hanoi',
        accountHandle: 'new-user',
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
        entityType: 'user',
        entityId: 'user-1',
      }),
    );
  });

  it('filters users by search tokens and clamps page to available range', async () => {
    mockPrisma.user.count.mockResolvedValue(1);
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        email: 'nguyenvan@example.com',
        phone: '0901234567',
        passwordHash: 'hashed-password',
        refreshToken: null,
        first_name: 'Nguyen',
        last_name: 'Van A',
        roleType: UserRole.guest,
        province: 'Hanoi',
        accountHandle: 'nguyenvan',
        createdAt: new Date('2026-03-20T10:00:00.000Z'),
        updatedAt: new Date('2026-03-20T10:00:00.000Z'),
      },
    ]);

    const response = await service.getUsers({
      page: 4,
      limit: 20,
      search: 'nguyen 0901',
    });

    const expectedWhere = {
      AND: [
        {
          OR: [
            { accountHandle: { contains: 'nguyen', mode: 'insensitive' } },
            { email: { contains: 'nguyen', mode: 'insensitive' } },
            { phone: { contains: 'nguyen', mode: 'insensitive' } },
            { first_name: { contains: 'nguyen', mode: 'insensitive' } },
            { last_name: { contains: 'nguyen', mode: 'insensitive' } },
          ],
        },
        {
          OR: [
            { accountHandle: { contains: '0901', mode: 'insensitive' } },
            { email: { contains: '0901', mode: 'insensitive' } },
            { phone: { contains: '0901', mode: 'insensitive' } },
            { first_name: { contains: '0901', mode: 'insensitive' } },
            { last_name: { contains: '0901', mode: 'insensitive' } },
          ],
        },
      ],
    };

    expect(mockPrisma.user.count).toHaveBeenCalledWith({
      where: expectedWhere,
    });
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: expectedWhere,
      skip: 0,
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
    expect(response.meta).toEqual({
      total: 1,
      page: 1,
      limit: 20,
    });
    expect(response.data).toEqual([
      expect.objectContaining({
        id: 'user-1',
        email: 'nguyenvan@example.com',
        accountHandle: 'nguyenvan',
      }),
    ]);
  });

  it('auto-creates a staff profile when roleType is changed to staff', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'new-user@example.com',
        phone: '0123456789',
        passwordHash: 'hashed-password',
        refreshToken: null,
        first_name: 'New',
        last_name: 'User',
        roleType: UserRole.guest,
        province: 'Hanoi',
        accountHandle: 'new-user',
        createdAt: new Date('2026-03-20T10:00:00.000Z'),
        updatedAt: new Date('2026-03-20T10:00:00.000Z'),
        staffInfo: null,
        studentInfo: null,
      })
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'new-user@example.com',
        phone: '0123456789',
        passwordHash: 'hashed-password',
        refreshToken: null,
        first_name: 'New',
        last_name: 'User',
        roleType: UserRole.staff,
        province: 'Hanoi',
        accountHandle: 'new-user',
        createdAt: new Date('2026-03-20T10:00:00.000Z'),
        updatedAt: new Date('2026-03-21T10:00:00.000Z'),
        staffInfo: {
          id: 'staff-1',
          fullName: 'New User',
          roles: ['teacher'],
        },
        studentInfo: null,
      });
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'new-user@example.com',
      phone: '0123456789',
      passwordHash: 'hashed-password',
      refreshToken: null,
      first_name: 'New',
      last_name: 'User',
      roleType: UserRole.staff,
      province: 'Hanoi',
      accountHandle: 'new-user',
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-21T10:00:00.000Z'),
    });
    mockPrisma.staffInfo.create.mockResolvedValue({
      id: 'staff-1',
    });
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      id: 'staff-1',
      fullName: 'New User',
      roles: ['teacher'],
      userId: 'user-1',
      status: 'active',
    });

    await service.updateUser(
      {
        id: 'user-1',
        roleType: UserRole.staff,
        staffRoles: ['teacher'],
      },
      {
        userId: 'admin-1',
        userEmail: 'admin@example.com',
        roleType: 'admin',
      },
    );

    expect(mockPrisma.staffInfo.create).toHaveBeenCalledWith({
      data: {
        fullName: 'New User',
        roles: ['teacher'],
        userId: 'user-1',
      },
    });
    expect(actionHistoryService.recordCreate).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        entityType: 'staff',
        entityId: 'staff-1',
      }),
    );
  });

  it('auto-creates a student profile when roleType is changed to student', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'new-user@example.com',
        phone: '0123456789',
        passwordHash: 'hashed-password',
        refreshToken: null,
        first_name: 'New',
        last_name: 'User',
        roleType: UserRole.guest,
        province: 'Hanoi',
        accountHandle: 'new-user',
        createdAt: new Date('2026-03-20T10:00:00.000Z'),
        updatedAt: new Date('2026-03-20T10:00:00.000Z'),
        staffInfo: null,
        studentInfo: null,
      })
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'new-user@example.com',
        phone: '0123456789',
        passwordHash: 'hashed-password',
        refreshToken: null,
        first_name: 'New',
        last_name: 'User',
        roleType: UserRole.student,
        province: 'Hanoi',
        accountHandle: 'new-user',
        createdAt: new Date('2026-03-20T10:00:00.000Z'),
        updatedAt: new Date('2026-03-21T10:00:00.000Z'),
        staffInfo: null,
        studentInfo: {
          id: 'student-1',
          fullName: 'New User',
        },
      });
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'new-user@example.com',
      phone: '0123456789',
      passwordHash: 'hashed-password',
      refreshToken: null,
      first_name: 'New',
      last_name: 'User',
      roleType: UserRole.student,
      province: 'Hanoi',
      accountHandle: 'new-user',
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-21T10:00:00.000Z'),
    });
    mockPrisma.studentInfo.create.mockResolvedValue({
      id: 'student-1',
    });
    mockPrisma.studentInfo.findUnique.mockResolvedValue({
      id: 'student-1',
      fullName: 'New User',
      email: 'new-user@example.com',
      province: 'Hanoi',
      userId: 'user-1',
      status: 'active',
    });

    await service.updateUser(
      {
        id: 'user-1',
        roleType: UserRole.student,
      },
      {
        userId: 'admin-1',
        userEmail: 'admin@example.com',
        roleType: 'admin',
      },
    );

    expect(mockPrisma.studentInfo.create).toHaveBeenCalledWith({
      data: {
        fullName: 'New User',
        email: 'new-user@example.com',
        province: 'Hanoi',
        userId: 'user-1',
      },
    });
    expect(actionHistoryService.recordCreate).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        entityType: 'student',
        entityId: 'student-1',
      }),
    );
  });

  it('gets linked student id via unique user mapping', async () => {
    mockPrisma.studentInfo.findUnique.mockResolvedValue({
      id: 'student-1',
    });

    await expect(service.getLinkedStudentId('user-1')).resolves.toBe('student-1');
    expect(mockPrisma.studentInfo.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { id: true },
    });
  });
});
