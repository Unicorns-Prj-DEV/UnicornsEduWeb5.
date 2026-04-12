jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

jest.mock('../staff-ops/staff-operations-access.service', () => ({
  StaffOperationsAccessService: class StaffOperationsAccessServiceMock {},
}));

jest.mock('../action-history/action-history.service', () => ({
  ActionHistoryService: class ActionHistoryServiceMock {},
}));

jest.mock('../../generated/client', () => ({
  Prisma: {},
}));

import { ClassService } from './class.service';

describe('ClassService.updateClassTeachers', () => {
  const mockTx = {
    class: {
      update: jest.fn(),
    },
    classTeacher: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  const mockPrisma = {
    class: {
      findUnique: jest.fn(),
    },
    classTeacher: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockStaffOperationsAccess = {};
  const mockActionHistoryService = {
    recordUpdate: jest.fn(),
  };

  let service: ClassService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma.class.findUnique.mockResolvedValue({
      id: 'class-1',
      name: 'Math 10A',
      schedule: [],
      allowancePerSessionPerStudent: 120000,
    });
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockTx) => Promise<unknown>) =>
        callback(mockTx),
    );
    mockTx.class.update.mockResolvedValue({ id: 'class-1' });
    mockTx.classTeacher.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.classTeacher.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.classTeacher.findMany.mockResolvedValue([]);

    service = new ClassService(
      mockPrisma as never,
      mockStaffOperationsAccess as never,
      mockActionHistoryService as never,
    );
    (service as any).getClassAuditSnapshot = jest.fn().mockResolvedValue({
      id: 'class-1',
      teachers: [],
    });
  });

  it('fills blank custom_allowance with the class default allowance', async () => {
    await service.updateClassTeachers('class-1', {
      teachers: [{ teacher_id: 'teacher-1' }],
    });

    expect(mockTx.classTeacher.createMany).toHaveBeenCalledWith({
      data: [
        {
          classId: 'class-1',
          teacherId: 'teacher-1',
          customAllowance: 120000,
        },
      ],
    });
  });

  it('rejects schedule slots whose responsible tutor is not assigned to the class', async () => {
    await expect(
      service.updateClassSchedule('class-1', {
        schedule: [
          {
            id: 'slot-1',
            dayOfWeek: 1,
            from: '19:00:00',
            to: '20:30:00',
            teacherId: 'teacher-99',
          },
        ],
      }),
    ).rejects.toThrow(
      'Gia sư chịu trách nhiệm phải thuộc danh sách gia sư hiện có của lớp.',
    );

    expect(mockTx.class.update).not.toHaveBeenCalled();
  });
});
