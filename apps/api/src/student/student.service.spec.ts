jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));
jest.mock('../../generated/client', () => ({
  Prisma: {},
}));

import { StudentStatus, UserRole } from '../../generated/enums';
import { StudentService } from './student.service';

describe('StudentService', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
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
      roleType: UserRole.guest,
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
        phone: '0901234567',
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
  });
});
