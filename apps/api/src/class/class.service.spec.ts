jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

jest.mock('../staff-ops/staff-operations-access.service', () => ({
  StaffOperationsAccessService: class StaffOperationsAccessServiceMock {},
}));

jest.mock('../action-history/action-history.service', () => ({
  ActionHistoryService: class ActionHistoryServiceMock {},
}));

jest.mock('../calendar/calendar.service', () => ({
  CalendarService: class CalendarServiceMock {},
}));

jest.mock('../../generated/client', () => ({
  Prisma: {},
}));

import { ClassService } from './class.service';

describe('ClassService', () => {
  const mockTx = {
    class: {
      update: jest.fn(),
    },
    classTeacher: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    classTeacherOperatingDeductionRate: {
      upsert: jest.fn(),
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
  const mockCalendarService = {
    syncScheduleWithCalendar: jest.fn().mockResolvedValue(undefined),
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
    mockTx.classTeacher.findMany.mockResolvedValue([]);
    mockTx.classTeacher.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.classTeacher.createMany.mockResolvedValue({ count: 1 });
    mockTx.classTeacherOperatingDeductionRate.upsert.mockResolvedValue({
      id: 'history-1',
    });
    mockPrisma.classTeacher.findMany.mockResolvedValue([]);

    service = new ClassService(
      mockPrisma as never,
      mockStaffOperationsAccess as never,
      mockActionHistoryService as never,
      mockCalendarService as never,
    );
    (service as any).getClassAuditSnapshot = jest.fn().mockResolvedValue({
      id: 'class-1',
      teachers: [],
    });
  });

  describe('updateClassTeachers', () => {
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
            operatingDeductionRatePercent: 0,
          },
        ],
      });
    });

    it('upserts same-day operating deduction history rows', async () => {
      await service.updateClassTeachers('class-1', {
        teachers: [
          {
            teacher_id: 'teacher-1',
            custom_allowance: 150000,
            operating_deduction_rate_percent: 7.5,
          },
        ],
      });

      expect(mockTx.classTeacher.createMany).toHaveBeenCalledWith({
        data: [
          {
            classId: 'class-1',
            teacherId: 'teacher-1',
            customAllowance: 150000,
            operatingDeductionRatePercent: 7.5,
          },
        ],
      });
      expect(
        mockTx.classTeacherOperatingDeductionRate.upsert,
      ).toHaveBeenCalledWith({
        where: {
          classId_teacherId_effectiveFrom: {
            classId: 'class-1',
            teacherId: 'teacher-1',
            effectiveFrom: expect.any(Date),
          },
        },
        create: {
          classId: 'class-1',
          teacherId: 'teacher-1',
          ratePercent: 7.5,
          effectiveFrom: expect.any(Date),
        },
        update: {
          ratePercent: 7.5,
        },
      });
    });
  });

  describe('updateClassSchedule', () => {
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

  describe('updateClass', () => {
    it('rejects schedule updates through the generic endpoint', async () => {
      await expect(
        service.updateClass({
          id: 'class-1',
          schedule: [
            {
              dayOfWeek: 1,
              from: '19:00:00',
              to: '20:30:00',
            },
          ],
        } as never),
      ).rejects.toThrow(
        'PATCH /class không nhận schedule. Hãy dùng PATCH /class/:id/schedule.',
      );

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
