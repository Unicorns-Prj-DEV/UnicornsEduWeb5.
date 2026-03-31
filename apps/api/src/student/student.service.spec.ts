jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));
jest.mock('../../generated/client', () => ({
  Prisma: {},
}));

import { StaffRole, StudentStatus, UserRole } from '../../generated/enums';
import { StudentService } from './student.service';

describe('StudentService', () => {
  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    studentInfo: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    customerCareService: {
      findUnique: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
    walletTransactionsHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    staffInfo: {
      findUnique: jest.fn(),
    },
    class: {
      findMany: jest.fn(),
    },
    studentClass: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const actionHistoryService = {
    recordCreate: jest.fn(),
    recordUpdate: jest.fn(),
    recordDelete: jest.fn(),
  };

  let service: StudentService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      (callback: (db: typeof mockPrisma) => unknown) => callback(mockPrisma),
    );
    service = new StudentService(
      mockPrisma as never,
      actionHistoryService as never,
    );
  });

  it('records action history after creating a student', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      province: 'Hanoi',
      roleType: UserRole.guest,
      studentInfo: null,
      staffInfo: null,
    });
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-1',
      roleType: UserRole.student,
    });
    mockPrisma.studentInfo.create.mockResolvedValue({
      id: 'student-1',
      fullName: 'Nguyen Van A',
      email: 'student@example.com',
      school: 'THPT Nguyen Du',
      province: 'Hanoi',
      birthYear: 2010,
      parentName: 'Parent A',
      parentPhone: '0900000000',
      status: StudentStatus.active,
      gender: 'male',
      goal: 'Top 1',
      userId: 'user-1',
      accountBalance: 0,
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-20T10:00:00.000Z'),
      dropOutDate: null,
      studentClasses: [],
      customerCareServices: null,
    });
    mockPrisma.studentInfo.findUnique.mockResolvedValue({
      id: 'student-1',
      fullName: 'Nguyen Van A',
      email: 'student@example.com',
      school: 'THPT Nguyen Du',
      province: 'Hanoi',
      birthYear: 2010,
      parentName: 'Parent A',
      parentPhone: '0900000000',
      status: StudentStatus.active,
      gender: 'male',
      goal: 'Top 1',
      userId: 'user-1',
      accountBalance: 0,
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-20T10:00:00.000Z'),
      dropOutDate: null,
      studentClasses: [],
      customerCareServices: null,
    });

    await service.createStudent(
      {
        full_name: 'Nguyen Van A',
        email: 'student@example.com',
        school: 'THPT Nguyen Du',
        province: 'Hanoi',
        birth_year: 2010,
        parent_name: 'Parent A',
        parent_phone: '0900000000',
        status: StudentStatus.active,
        gender: 'male',
        goal: 'Top 1',
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
        entityType: 'student',
        entityId: 'student-1',
      }),
    );
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: {
        id: 'user-1',
      },
      data: {
        roleType: UserRole.student,
      },
    });
  });

  it('rejects creating a student for a user that already has a staff profile', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      province: 'Hanoi',
      roleType: UserRole.guest,
      studentInfo: null,
      staffInfo: {
        id: 'staff-1',
      },
    });

    await expect(
      service.createStudent({
        full_name: 'Nguyen Van A',
        user_id: 'user-1',
      }),
    ).rejects.toThrow('User này đang có hồ sơ nhân sự nên không thể gán làm học sinh.');

    expect(mockPrisma.studentInfo.create).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('returns self detail with read-only tuition fields', async () => {
    mockPrisma.studentInfo.findUnique.mockResolvedValue({
      id: 'student-1',
      fullName: 'Nguyen Van A',
      email: 'student@example.com',
      school: 'THPT Nguyen Du',
      province: 'Hanoi',
      birthYear: 2010,
      parentName: 'Parent A',
      parentPhone: '0900000000',
      status: StudentStatus.active,
      gender: 'male',
      goal: 'Top 1',
      accountBalance: 250000,
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-21T10:00:00.000Z'),
      dropOutDate: null,
      customerCareServices: {
        staff: {
          id: 'staff-1',
          fullName: 'CSKH A',
          roles: ['customer_care'],
          status: 'active',
        },
        profitPercent: 0.2,
      },
      studentClasses: [
        {
          totalAttendedSession: 6,
          customStudentTuitionPerSession: 100000,
          customTuitionPackageTotal: 900000,
          customTuitionPackageSession: 9,
          class: {
            id: 'class-1',
            name: 'Toan 8A',
            status: 'running',
            tuitionPackageTotal: 1200000,
            tuitionPackageSession: 12,
            studentTuitionPerSession: 100000,
          },
        },
      ],
    });

    const result = await service.getStudentSelfDetail('student-1');

    expect(result).toEqual({
      id: 'student-1',
      fullName: 'Nguyen Van A',
      email: 'student@example.com',
      accountBalance: 250000,
      school: 'THPT Nguyen Du',
      province: 'Hanoi',
      status: StudentStatus.active,
      gender: 'male',
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-21T10:00:00.000Z'),
      birthYear: 2010,
      parentName: 'Parent A',
      parentPhone: '0900000000',
      goal: 'Top 1',
      studentClasses: [
        {
          class: {
            id: 'class-1',
            name: 'Toan 8A',
            status: 'running',
          },
          customTuitionPerSession: 100000,
          customTuitionPackageTotal: 900000,
          customTuitionPackageSession: 9,
          effectiveTuitionPerSession: 100000,
          effectiveTuitionPackageTotal: 900000,
          effectiveTuitionPackageSession: 9,
          tuitionPackageSource: 'custom',
          totalAttendedSession: 6,
        },
      ],
    });
    expect(result).not.toHaveProperty('customerCare');
    expect(result.studentClasses[0]).toMatchObject({
      effectiveTuitionPerSession: 100000,
      effectiveTuitionPackageTotal: 900000,
      effectiveTuitionPackageSession: 9,
      tuitionPackageSource: 'custom',
    });
  });

  it('blocks self-service withdraw when resulting balance would be negative', async () => {
    mockPrisma.studentInfo.findUnique.mockResolvedValue({
      id: 'student-1',
      accountBalance: 100000,
    });

    await expect(
      service.updateMyStudentAccountBalance('student-1', {
        amount: -150000,
      }),
    ).rejects.toThrow('Insufficient balance');

    expect(mockPrisma.walletTransactionsHistory.create).not.toHaveBeenCalled();
    expect(mockPrisma.studentInfo.update).not.toHaveBeenCalled();
  });

  it('allows customer care staff to read the detail of their assigned student', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      id: 'staff-1',
      roles: [StaffRole.customer_care],
    });
    mockPrisma.customerCareService.findUnique.mockResolvedValue({
      staffId: 'staff-1',
    });
    mockPrisma.studentInfo.findUnique.mockResolvedValue({
      id: 'student-1',
      fullName: 'Nguyen Van A',
      email: 'student@example.com',
      school: 'THPT Nguyen Du',
      province: 'Hanoi',
      birthYear: 2010,
      parentName: 'Parent A',
      parentPhone: '0900000000',
      status: StudentStatus.active,
      gender: 'male',
      goal: 'Top 1',
      accountBalance: 250000,
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-21T10:00:00.000Z'),
      dropOutDate: null,
      customerCareServices: null,
      studentClasses: [],
    });

    await expect(
      service.getStudentById('student-1', {
        userId: 'user-1',
        roleType: UserRole.staff,
      }),
    ).resolves.toMatchObject({
      id: 'student-1',
      fullName: 'Nguyen Van A',
    });
  });

  it('rejects customer care staff when the student is not assigned to them', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      id: 'staff-1',
      roles: [StaffRole.customer_care],
    });
    mockPrisma.customerCareService.findUnique.mockResolvedValue({
      staffId: 'staff-2',
    });

    await expect(
      service.getStudentById('student-1', {
        userId: 'user-1',
        roleType: UserRole.staff,
      }),
    ).rejects.toThrow('Student not found');

    expect(mockPrisma.studentInfo.findUnique).not.toHaveBeenCalled();
  });
});
