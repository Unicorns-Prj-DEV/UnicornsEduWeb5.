jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));
jest.mock('./session-student-balance.service', () => ({
  SessionStudentBalanceService: class SessionStudentBalanceServiceMock {},
}));
jest.mock('../payroll/lesson-plan-head-commission.util', () => ({
  syncLessonPlanHeadCommissions: jest.fn(),
}));

import { AttendanceStatus, StaffRole, UserRole } from '../../generated/enums';
import { SessionCreateService } from './session-create.service';

describe('SessionCreateService', () => {
  const mockPrisma = {
    $transaction: jest.fn(),
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
    validateAttendanceNotes: jest.fn(),
    validateSessionCommentFields: jest.fn(),
    isTuitionChargeableStatus: jest.fn().mockReturnValue(true),
    resolveChargeableAttendanceTuitionFee: jest.fn(),
    resolveDefaultStudentTuitionPerSession: jest.fn(),
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

  const scheduleRulesService = {
    assertSessionMatchesDeclaredSchedule: jest.fn(),
    linkMakeupEventToSession: jest.fn(),
  };

  const actionHistoryService = {
    recordCreate: jest.fn(),
  };

  function baseTx(overrides: Record<string, unknown> = {}) {
    return {
      staffTaxDeductionOverride: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      roleTaxDeductionRate: { findFirst: jest.fn().mockResolvedValue(null) },
      walletTransactionsHistory: {
        createManyAndReturn: jest.fn().mockResolvedValue([]),
      },
      ...overrides,
    };
  }

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
      scheduleRulesService as never,
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
        coefficient: 1.5,
        notes: 'Buổi thử',
        lessonContent: '<p>Đã làm 2 bài LEVEL 2</p>',
        homework: '<p>Làm bài 3</p>',
        tutorial: '<p>Hướng dẫn buổi</p>',
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
    expect(createSessionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        classId: 'class-1',
        teacherId: 'teacher-1',
        date: '2026-03-20',
        coefficient: 1.5,
        startTime: undefined,
        endTime: undefined,
        notes: 'Buổi thử',
        lessonContent: '<p>Đã làm 2 bài LEVEL 2</p>',
        homework: '<p>Làm bài 3</p>',
        tutorial: '<p>Hướng dẫn buổi</p>',
        attendance: [
          {
            studentId: 'student-1',
            status: AttendanceStatus.present,
            notes: null,
          },
        ],
      }),
      {
        userId: 'user-1',
        userEmail: 'teacher@example.com',
        roleType: 'staff',
      },
    );
    expect(createSessionSpy.mock.calls[0][0].allowanceAmount).toBeUndefined();
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
        lessonContent: '<p>Nội dung buổi</p>',
        homework: '<p>BTVN</p>',
        tutorial: '<p>Tutorial buổi</p>',
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
    expect(createSessionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        classId: 'class-1',
        teacherId: 'teacher-9',
        date: '2026-03-20',
        startTime: undefined,
        endTime: undefined,
        notes: null,
        lessonContent: '<p>Nội dung buổi</p>',
        homework: '<p>BTVN</p>',
        tutorial: '<p>Tutorial buổi</p>',
        attendance: [
          {
            studentId: 'student-1',
            status: AttendanceStatus.present,
            notes: null,
          },
        ],
      }),
      {
        userId: 'user-1',
        userEmail: 'admin@example.com',
        roleType: 'admin',
      },
    );
    expect(createSessionSpy.mock.calls[0][0].allowanceAmount).toBeUndefined();
  });

  it('throws BadRequestException when creating session with >= 2 students without recordingUrl', async () => {
    mockPrisma.$transaction.mockImplementation(async (callback: never) => {
      const tx = {
        classTeacher: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'ct-1',
            customAllowance: null,
            operatingDeductionRatePercent: 0,
            class: {
              allowancePerSessionPerStudent: 100000,
              scaleAmount: null,
              tuitionPackageTotal: 10,
              tuitionPackageSession: 10,
            },
          }),
        },
        customerCareService: { findMany: jest.fn().mockResolvedValue([]) },
        studentClass: {
          findMany: jest.fn().mockResolvedValue([
            {
              studentId: 'student-1',
              customStudentTuitionPerSession: 100000,
              student: { accountBalance: 0 },
              class: {},
            },
            {
              studentId: 'student-2',
              customStudentTuitionPerSession: 100000,
              student: { accountBalance: 0 },
              class: {},
            },
          ]),
        },
      };
      return (callback as (tx: unknown) => Promise<unknown>)(tx);
    });
    scheduleRulesService.assertSessionMatchesDeclaredSchedule.mockResolvedValue(
      null,
    );

    await expect(
      service.createSession({
        classId: 'class-1',
        teacherId: 'teacher-1',
        date: '2026-03-20',
        lessonContent: '<p>Nội dung</p>',
        homework: '<p>BTVN</p>',
        tutorial: '<p>Tutorial</p>',
        attendance: [
          {
            studentId: 'student-1',
            status: AttendanceStatus.present,
            notes: null,
          },
          {
            studentId: 'student-2',
            status: AttendanceStatus.present,
            notes: null,
          },
        ],
      }),
    ).rejects.toThrow(
      'Link video YouTube (recording) là bắt buộc đối với lớp có từ 2 học sinh trở lên.',
    );
  });

  it('noAttendance class auto-generates present for all active students and snapshots snapshotNoAttendance', async () => {
    let capturedCreateData: Record<string, unknown> | undefined;

    mockPrisma.$transaction.mockImplementation(async (callback: never) => {
      const tx = baseTx({
        classTeacher: {
          findUnique: jest.fn().mockResolvedValue({
            customAllowance: null,
            operatingDeductionRatePercent: 0,
            class: {
              name: 'Lớp thử',
              noAttendance: true,
              allowancePerSessionPerStudent: 100000,
              scaleAmount: null,
              trainingManagerStaffId: null,
              trainingManagerRatePercent: null,
            },
          }),
        },
        studentClass: {
          findMany: jest.fn().mockResolvedValue([
            {
              studentId: 's1',
              customStudentTuitionPerSession: null,
              customTuitionPackageTotal: null,
              customTuitionPackageSession: null,
              class: { studentTuitionPerSession: 100000 },
              student: { accountBalance: 500000 },
            },
            {
              studentId: 's2',
              customStudentTuitionPerSession: null,
              customTuitionPackageTotal: null,
              customTuitionPackageSession: null,
              class: { studentTuitionPerSession: 100000 },
              student: { accountBalance: 500000 },
            },
          ]),
        },
        customerCareService: { findMany: jest.fn().mockResolvedValue([]) },
        staffInfo: { findMany: jest.fn().mockResolvedValue([]) },
        session: {
          create: jest
            .fn()
            .mockImplementation((args: Record<string, unknown>) => {
              capturedCreateData = (args as { data: Record<string, unknown> })
                .data;
              return Promise.resolve({
                id: 'session-noatt',
                attendance: [
                  { id: 'att-1', studentId: 's1' },
                  { id: 'att-2', studentId: 's2' },
                ],
              });
            }),
        },
      });
      return (callback as (tx: unknown) => Promise<unknown>)(tx);
    });
    scheduleRulesService.assertSessionMatchesDeclaredSchedule.mockResolvedValue(
      { makeupEventId: null },
    );
    validationService.parseSessionDate.mockReturnValue(new Date('2026-03-20'));
    validationService.normalizeCoefficient.mockReturnValue(1);
    validationService.isTuitionChargeableStatus.mockReturnValue(true);
    validationService.resolveChargeableAttendanceTuitionFee.mockReturnValue(
      100000,
    );
    validationService.resolveDefaultStudentTuitionPerSession.mockReturnValue(
      100000,
    );

    const result = await service.createSession({
      classId: 'class-1',
      teacherId: 'teacher-1',
      date: '2026-03-20',
      lessonContent: '<p>Content</p>',
      homework: '<p>HW</p>',
      tutorial: '<p>Tut</p>',
      recordingUrl: 'https://youtu.be/x',
    });

    expect(result.id).toBe('session-noatt');
    expect(capturedCreateData).toBeDefined();
    expect(capturedCreateData!.snapshotNoAttendance).toBe(true);
    const attendanceCreate = (
      capturedCreateData!.attendance as {
        createMany: { data: Array<{ studentId: string; status: string }> };
      }
    ).createMany.data;
    expect(attendanceCreate).toHaveLength(2);
    expect(attendanceCreate.map((a) => a.studentId).sort()).toEqual([
      's1',
      's2',
    ]);
    expect(
      attendanceCreate.every((a) => a.status === AttendanceStatus.present),
    ).toBe(true);
  });

  it('normal class preserves existing attendance behavior (no auto-generate)', async () => {
    let capturedCreateData: Record<string, unknown> | undefined;

    mockPrisma.$transaction.mockImplementation(async (callback: never) => {
      const tx = baseTx({
        classTeacher: {
          findUnique: jest.fn().mockResolvedValue({
            customAllowance: null,
            operatingDeductionRatePercent: 0,
            class: {
              name: 'Lớp thường',
              noAttendance: false,
              allowancePerSessionPerStudent: 100000,
              scaleAmount: null,
              trainingManagerStaffId: null,
              trainingManagerRatePercent: null,
            },
          }),
        },
        customerCareService: { findMany: jest.fn().mockResolvedValue([]) },
        staffInfo: { findMany: jest.fn().mockResolvedValue([]) },
        studentClass: {
          findMany: jest.fn().mockResolvedValue([
            {
              studentId: 'student-1',
              customStudentTuitionPerSession: null,
              customTuitionPackageTotal: null,
              customTuitionPackageSession: null,
              class: { studentTuitionPerSession: 100000 },
              student: { accountBalance: 500000 },
            },
          ]),
        },
        session: {
          create: jest
            .fn()
            .mockImplementation((args: Record<string, unknown>) => {
              capturedCreateData = (args as { data: Record<string, unknown> })
                .data;
              return Promise.resolve({
                id: 'session-normal',
                attendance: [{ id: 'att-1', studentId: 'student-1' }],
              });
            }),
        },
      });
      return (callback as (tx: unknown) => Promise<unknown>)(tx);
    });
    scheduleRulesService.assertSessionMatchesDeclaredSchedule.mockResolvedValue(
      { makeupEventId: null },
    );
    validationService.parseSessionDate.mockReturnValue(new Date('2026-03-20'));
    validationService.normalizeCoefficient.mockReturnValue(1);
    validationService.isTuitionChargeableStatus.mockReturnValue(true);
    validationService.resolveChargeableAttendanceTuitionFee.mockReturnValue(
      100000,
    );
    validationService.resolveDefaultStudentTuitionPerSession.mockReturnValue(
      100000,
    );

    const result = await service.createSession({
      classId: 'class-1',
      teacherId: 'teacher-1',
      date: '2026-03-20',
      lessonContent: '<p>Content</p>',
      homework: '<p>HW</p>',
      tutorial: '<p>Tut</p>',
      recordingUrl: 'https://youtu.be/x',
      attendance: [
        {
          studentId: 'student-1',
          status: AttendanceStatus.present,
          notes: null,
        },
      ],
    });

    expect(result.id).toBe('session-normal');
    expect(capturedCreateData).toBeDefined();
    expect(capturedCreateData!.snapshotNoAttendance).toBe(false);
    const attendanceCreate = (
      capturedCreateData!.attendance as {
        createMany: { data: Array<{ studentId: string }> };
      }
    ).createMany.data;
    expect(attendanceCreate).toHaveLength(1);
    expect(attendanceCreate[0].studentId).toBe('student-1');
  });

  it('noAttendance class still charges tuition for present students (ADR requirement)', async () => {
    let capturedCreateData: Record<string, unknown> | undefined;

    mockPrisma.$transaction.mockImplementation(async (callback: never) => {
      const tx = baseTx({
        classTeacher: {
          findUnique: jest.fn().mockResolvedValue({
            customAllowance: null,
            operatingDeductionRatePercent: 0,
            class: {
              name: 'Lớp phí',
              noAttendance: true,
              allowancePerSessionPerStudent: 100000,
              scaleAmount: null,
              trainingManagerStaffId: null,
              trainingManagerRatePercent: null,
            },
          }),
        },
        studentClass: {
          findMany: jest.fn().mockResolvedValue([
            {
              studentId: 's1',
              customStudentTuitionPerSession: null,
              customTuitionPackageTotal: null,
              customTuitionPackageSession: null,
              class: { studentTuitionPerSession: 100000 },
              student: { accountBalance: 500000 },
            },
            {
              studentId: 's2',
              customStudentTuitionPerSession: null,
              customTuitionPackageTotal: null,
              customTuitionPackageSession: null,
              class: { studentTuitionPerSession: 100000 },
              student: { accountBalance: 500000 },
            },
          ]),
        },
        customerCareService: { findMany: jest.fn().mockResolvedValue([]) },
        staffInfo: { findMany: jest.fn().mockResolvedValue([]) },
        session: {
          create: jest
            .fn()
            .mockImplementation((args: Record<string, unknown>) => {
              capturedCreateData = (args as { data: Record<string, unknown> })
                .data;
              return Promise.resolve({
                id: 'session-fee',
                attendance: [
                  { id: 'a1', studentId: 's1' },
                  { id: 'a2', studentId: 's2' },
                ],
              });
            }),
        },
      });
      return (callback as (tx: unknown) => Promise<unknown>)(tx);
    });
    scheduleRulesService.assertSessionMatchesDeclaredSchedule.mockResolvedValue(
      { makeupEventId: null },
    );
    validationService.parseSessionDate.mockReturnValue(new Date('2026-03-20'));
    validationService.normalizeCoefficient.mockReturnValue(1);
    validationService.isTuitionChargeableStatus.mockReturnValue(true);
    validationService.resolveChargeableAttendanceTuitionFee.mockReturnValue(
      150000,
    );
    validationService.resolveDefaultStudentTuitionPerSession.mockReturnValue(
      150000,
    );

    await service.createSession({
      classId: 'class-1',
      teacherId: 'teacher-1',
      date: '2026-03-20',
      lessonContent: '<p>Content</p>',
      homework: '<p>HW</p>',
      tutorial: '<p>Tut</p>',
      recordingUrl: 'https://youtu.be/x',
    });

    expect(capturedCreateData).toBeDefined();
    // ADR: tuition still charges — 2 students × 150000 = 300000
    expect(capturedCreateData!.tuitionFee).toBe(300000);
  });
});
