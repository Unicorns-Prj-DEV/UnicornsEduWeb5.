jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));
jest.mock('./session-student-balance.service', () => ({
  SessionStudentBalanceService: class SessionStudentBalanceServiceMock {},
}));

import { AttendanceStatus, StaffRole, UserRole } from '../../generated/enums';
import { SessionCreateService } from './session-create.service';

describe('SessionCreateService', () => {
  const mockPrisma = {
    classTeacher: {
      findUnique: jest.fn(),
    },
  };

  const accessService = {
    resolveActor: jest.fn(),
    assertTeacherAssignedToClass: jest.fn(),
    resolveSingleTeacherForClass: jest.fn(),
  };

  const rosterService = {
    assertAttendanceStudentsBelongToClass: jest.fn(),
  };

  const validationService = {
    validateAttendanceItems: jest.fn(),
    resolveChargeableAttendanceTuitionFee: jest.fn(),
    parseSessionDate: jest.fn(),
    parseSessionTime: jest.fn(),
    normalizeCoefficient: jest.fn(),
  };

  const balanceService = {
    applyBalanceChanges: jest.fn(),
  };

  const ledgerService = {
    buildChargeNote: jest.fn(),
  };

  const snapshotService = {
    getSessionAuditSnapshot: jest.fn(),
  };

  const actionHistoryService = {
    recordCreate: jest.fn(),
  };

  let service: SessionCreateService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SessionCreateService(
      mockPrisma as never,
      accessService as never,
      rosterService as never,
      validationService as never,
      balanceService as never,
      ledgerService as never,
      snapshotService as never,
      actionHistoryService as never,
    );
  });

  it('uses the current teacher actor when staff creates a session', async () => {
    accessService.resolveActor.mockResolvedValue({
      id: 'teacher-1',
      roles: [StaffRole.teacher],
    });
    rosterService.assertAttendanceStudentsBelongToClass.mockResolvedValue(
      new Map([['student-1', 150000]]),
    );
    mockPrisma.classTeacher.findUnique.mockResolvedValue({
      customAllowance: 120000,
    });

    const createSessionSpy = jest
      .spyOn(service, 'createSession')
      .mockResolvedValue({ id: 'session-1' } as never);

    await service.createSessionForStaff(
      'user-1',
      UserRole.staff,
      'class-1',
      {
        date: '2026-03-20',
        notes: 'Buổi thử',
        attendance: [
          {
            studentId: 'student-1',
            status: AttendanceStatus.present,
          },
        ],
      },
      {
        userId: 'user-1',
        userEmail: 'teacher@example.com',
        roleType: 'staff',
      },
    );

    expect(accessService.assertTeacherAssignedToClass).toHaveBeenCalledWith(
      'teacher-1',
      'class-1',
    );
    expect(accessService.resolveSingleTeacherForClass).not.toHaveBeenCalled();
    expect(createSessionSpy).toHaveBeenCalledWith({
      classId: 'class-1',
      teacherId: 'teacher-1',
      date: '2026-03-20',
      allowanceAmount: 120000,
      startTime: undefined,
      endTime: undefined,
      notes: 'Buổi thử',
      attendance: [
        {
          studentId: 'student-1',
          status: AttendanceStatus.present,
          notes: null,
        },
      ],
    }, {
      userId: 'user-1',
      userEmail: 'teacher@example.com',
      roleType: 'staff',
    });
  });

  it('resolves the class teacher when admin creates a staff-ops session', async () => {
    accessService.resolveActor.mockResolvedValue({
      id: 'admin-1',
      roles: [],
    });
    accessService.resolveSingleTeacherForClass.mockResolvedValue('teacher-9');
    rosterService.assertAttendanceStudentsBelongToClass.mockResolvedValue(
      new Map([['student-1', 150000]]),
    );
    mockPrisma.classTeacher.findUnique.mockResolvedValue({
      customAllowance: null,
    });

    const createSessionSpy = jest
      .spyOn(service, 'createSession')
      .mockResolvedValue({ id: 'session-2' } as never);

    await service.createSessionForStaff(
      'user-1',
      UserRole.admin,
      'class-1',
      {
        date: '2026-03-20',
        attendance: [
          {
            studentId: 'student-1',
            status: AttendanceStatus.present,
          },
        ],
      },
      {
        userId: 'user-1',
        userEmail: 'admin@example.com',
        roleType: 'admin',
      },
    );

    expect(accessService.assertTeacherAssignedToClass).not.toHaveBeenCalled();
    expect(accessService.resolveSingleTeacherForClass).toHaveBeenCalledWith(
      'class-1',
    );
    expect(createSessionSpy).toHaveBeenCalledWith({
      classId: 'class-1',
      teacherId: 'teacher-9',
      date: '2026-03-20',
      allowanceAmount: null,
      startTime: undefined,
      endTime: undefined,
      notes: null,
      attendance: [
        {
          studentId: 'student-1',
          status: AttendanceStatus.present,
          notes: null,
        },
      ],
    }, {
      userId: 'user-1',
      userEmail: 'admin@example.com',
      roleType: 'admin',
    });
  });
});
