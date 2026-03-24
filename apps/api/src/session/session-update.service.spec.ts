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
      updateMany: jest.fn(),
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
        teacherPaymentStatus: SessionPaymentStatus.unpaid,
      },
      {
        id: 'session-2',
        teacherPaymentStatus: SessionPaymentStatus.paid,
      },
    ]);
    snapshotService.getSessionAuditSnapshot
      .mockResolvedValueOnce({
        id: 'session-1',
        teacherPaymentStatus: 'unpaid',
      })
      .mockResolvedValueOnce({ id: 'session-1', teacherPaymentStatus: 'paid' });

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
    expect(result).toEqual({
      requestedCount: 2,
      updatedCount: 1,
    });
  });
});
