jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));
jest.mock('./session-student-balance.service', () => ({
  SessionStudentBalanceService: class SessionStudentBalanceServiceMock {},
}));

import {
  AttendanceStatus,
  SessionPaymentStatus,
  StaffRole,
  UserRole,
} from '../../generated/enums';
import { SessionValidationService } from './session-validation.service';
import { SessionUpdateService } from './session-update.service';

describe('SessionUpdateService', () => {
  const mockPrisma = {
    $transaction: jest.fn(),
    session: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    classTeacher: {
      findUnique: jest.fn(),
    },
    roleTaxDeductionRate: {
      findFirst: jest.fn(),
    },
    staffTaxDeductionOverride: {
      findFirst: jest.fn(),
    },
  };

  const accessService = {
    resolveActor: jest.fn(),
    assertTeacherAssignedToClass: jest.fn(),
  };

  const rosterService = {
    assertAttendanceStudentsBelongToClass: jest.fn(),
  };

  const balanceService = {
    applyBalanceChanges: jest.fn(),
  };

  const ledgerService = {
    getAttendanceChargeAmount: jest.fn(),
    buildChargeNote: jest.fn(),
    buildRefundNote: jest.fn(),
  };

  const snapshotService = {
    getSessionAuditSnapshot: jest.fn(),
    getSessionAuditSnapshots: jest.fn(),
  };

  const actionHistoryService = {
    recordUpdate: jest.fn(),
  };

  let service: SessionUpdateService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma),
    );
    mockPrisma.session.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.session.update.mockResolvedValue({ id: 'session-1' });
    mockPrisma.classTeacher.findUnique.mockResolvedValue(null);
    mockPrisma.roleTaxDeductionRate.findFirst.mockResolvedValue(null);
    mockPrisma.staffTaxDeductionOverride.findFirst.mockResolvedValue(null);
    service = new SessionUpdateService(
      mockPrisma as never,
      accessService as never,
      rosterService as never,
      new SessionValidationService(),
      balanceService as never,
      ledgerService as never,
      snapshotService as never,
      actionHistoryService as never,
    );
  });

  it('keeps existing tuition for current students and falls back to class tuition for new students', async () => {
    mockPrisma.session.findUnique.mockResolvedValue({
      id: 'session-1',
      classId: 'class-1',
      attendance: [
        {
          studentId: 'student-1',
          tuitionFee: 250000,
        },
      ],
    });
    accessService.resolveActor.mockResolvedValue({
      id: 'teacher-1',
      roles: [StaffRole.teacher],
    });
    rosterService.assertAttendanceStudentsBelongToClass.mockResolvedValue(
      new Map([
        ['student-1', 180000],
        ['student-2', 150000],
      ]),
    );

    const updateSessionSpy = jest
      .spyOn(service, 'updateSession')
      .mockResolvedValue({ id: 'session-1' } as never);

    await service.updateSessionForStaff('user-1', UserRole.staff, 'session-1', {
      coefficient: 1.8,
      attendance: [
        {
          studentId: 'student-1',
          status: AttendanceStatus.present,
        },
        {
          studentId: 'student-2',
          status: AttendanceStatus.present,
          notes: 'Đi học bù',
        },
      ],
    });

    expect(accessService.assertTeacherAssignedToClass).toHaveBeenCalledWith(
      'teacher-1',
      'class-1',
    );
    expect(updateSessionSpy).toHaveBeenCalledWith(
      {
        id: 'session-1',
        date: undefined,
        startTime: undefined,
        endTime: undefined,
        notes: undefined,
        coefficient: 1.8,
        attendance: [
          {
            studentId: 'student-1',
            status: AttendanceStatus.present,
            notes: null,
            tuitionFee: 250000,
          },
          {
            studentId: 'student-2',
            status: AttendanceStatus.present,
            notes: 'Đi học bù',
            tuitionFee: 150000,
          },
        ],
      },
      undefined,
    );
  });

  it('updates only sessions whose payment status actually changes', async () => {
    mockPrisma.session.findMany.mockResolvedValue([
      {
        id: 'session-1',
        classId: 'class-1',
        teacherId: 'teacher-1',
        teacherPaymentStatus: SessionPaymentStatus.unpaid,
      },
      {
        id: 'session-2',
        classId: 'class-1',
        teacherId: 'teacher-1',
        teacherPaymentStatus: SessionPaymentStatus.paid,
      },
    ]);
    mockPrisma.classTeacher.findUnique.mockResolvedValue({
      operatingDeductionRatePercent: 7,
    });
    mockPrisma.roleTaxDeductionRate.findFirst.mockResolvedValue({
      ratePercent: 12,
    });
    mockPrisma.session.updateMany.mockResolvedValue({ count: 1 });
    snapshotService.getSessionAuditSnapshots
      .mockResolvedValueOnce(
        new Map([
          [
            'session-1',
            {
              id: 'session-1',
              teacherPaymentStatus: 'unpaid',
            },
          ],
        ]),
      )
      .mockResolvedValueOnce(
        new Map([
          [
            'session-1',
            {
              id: 'session-1',
              teacherPaymentStatus: 'paid',
            },
          ],
        ]),
      );

    const result = await service.updateSessionPaymentStatuses(
      ['session-1', 'session-2'],
      SessionPaymentStatus.paid,
      {
        userId: 'admin-1',
        userEmail: 'admin@example.com',
        roleType: UserRole.admin,
      },
    );

    expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['session-1'],
        },
      },
      data: {
        teacherPaymentStatus: SessionPaymentStatus.paid,
        teacherOperatingDeductionRatePercent: 7,
        teacherTaxDeductionRatePercent: 12,
      },
    });
    expect(actionHistoryService.recordUpdate).toHaveBeenCalledTimes(1);
    expect(actionHistoryService.recordUpdate).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        entityType: 'session',
        entityId: 'session-1',
        description: 'Cập nhật trạng thái thanh toán buổi học',
      }),
    );
    expect(snapshotService.getSessionAuditSnapshots).toHaveBeenNthCalledWith(
      1,
      mockPrisma,
      ['session-1'],
    );
    expect(snapshotService.getSessionAuditSnapshots).toHaveBeenNthCalledWith(
      2,
      mockPrisma,
      ['session-1'],
    );
    expect(result).toEqual({
      requestedCount: 2,
      updatedCount: 1,
    });
  });

  it('snapshots zero deductions when bulk-paying deposit sessions', async () => {
    mockPrisma.session.findMany.mockResolvedValue([
      {
        id: 'session-1',
        classId: 'class-1',
        teacherId: 'teacher-1',
        teacherPaymentStatus: SessionPaymentStatus.deposit,
      },
    ]);
    mockPrisma.session.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.updateSessionPaymentStatuses(
      ['session-1'],
      SessionPaymentStatus.paid,
    );

    expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['session-1'],
        },
      },
      data: {
        teacherPaymentStatus: SessionPaymentStatus.paid,
        teacherOperatingDeductionRatePercent: 0,
        teacherTaxDeductionRatePercent: 0,
      },
    });
    expect(result).toEqual({
      requestedCount: 1,
      updatedCount: 1,
    });
  });

  it('resets deduction snapshots when bulk-moving paid sessions back to unpaid', async () => {
    mockPrisma.session.findMany.mockResolvedValue([
      {
        id: 'session-1',
        classId: 'class-1',
        teacherId: 'teacher-1',
        teacherPaymentStatus: SessionPaymentStatus.paid,
      },
    ]);
    mockPrisma.session.updateMany.mockResolvedValue({ count: 1 });

    await service.updateSessionPaymentStatuses(
      ['session-1'],
      SessionPaymentStatus.unpaid,
    );

    expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['session-1'],
        },
      },
      data: {
        teacherPaymentStatus: SessionPaymentStatus.unpaid,
        teacherOperatingDeductionRatePercent: 0,
        teacherTaxDeductionRatePercent: 0,
      },
    });
  });

  it('snapshots current deduction rates when updating a session payment status to paid', async () => {
    mockPrisma.session.findUnique
      .mockResolvedValueOnce({
        id: 'session-1',
        classId: 'class-1',
        teacherId: 'teacher-1',
        date: new Date('2026-03-15T00:00:00.000Z'),
        teacherPaymentStatus: SessionPaymentStatus.unpaid,
        class: {
          name: 'Toán 10A',
        },
        attendance: [],
      })
      .mockResolvedValueOnce({
        id: 'session-1',
        attendance: [],
      });
    mockPrisma.classTeacher.findUnique.mockResolvedValue({
      operatingDeductionRatePercent: 6,
    });
    mockPrisma.roleTaxDeductionRate.findFirst.mockResolvedValue({
      ratePercent: 11,
    });

    await service.updateSession({
      id: 'session-1',
      teacherPaymentStatus: SessionPaymentStatus.paid,
    });

    expect(mockPrisma.session.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: expect.objectContaining({
        teacherPaymentStatus: SessionPaymentStatus.paid,
        teacherOperatingDeductionRatePercent: 6,
        teacherTaxDeductionRatePercent: 11,
      }),
    });
  });

  it('does not overwrite paid deduction snapshots when paid status is unchanged', async () => {
    mockPrisma.session.findUnique
      .mockResolvedValueOnce({
        id: 'session-1',
        classId: 'class-1',
        teacherId: 'teacher-1',
        date: new Date('2026-03-15T00:00:00.000Z'),
        teacherPaymentStatus: SessionPaymentStatus.paid,
        class: {
          name: 'Toán 10A',
        },
        attendance: [],
      })
      .mockResolvedValueOnce({
        id: 'session-1',
        attendance: [],
      });

    await service.updateSession({
      id: 'session-1',
      teacherPaymentStatus: SessionPaymentStatus.paid,
    });

    const updateArgs = mockPrisma.session.update.mock.calls[0][0];
    expect(updateArgs).toMatchObject({
      where: { id: 'session-1' },
      data: {
        teacherPaymentStatus: SessionPaymentStatus.paid,
      },
    });
    expect(updateArgs.data).not.toHaveProperty(
      'teacherOperatingDeductionRatePercent',
    );
    expect(updateArgs.data).not.toHaveProperty(
      'teacherTaxDeductionRatePercent',
    );
  });
});
