import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceStatus,
  PaymentStatus,
  StaffRole,
  UserRole,
  WalletTransactionType,
} from '../../generated/enums';
import {
  ActionHistoryActor,
  ActionHistoryService,
} from '../action-history/action-history.service';
import { SessionCreateDto } from '../dtos/session.dto';
import { PrismaService } from '../prisma/prisma.service';
import { StaffOperationsAccessService } from '../staff-ops/staff-operations-access.service';
import { SessionLedgerService } from './session-ledger.service';
import { SessionRosterService } from './session-roster.service';
import { SessionSnapshotService } from './session-snapshot.service';
import { SessionStudentBalanceService } from './session-student-balance.service';
import { SessionValidationService } from './session-validation.service';

@Injectable()
export class SessionCreateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffOperationsAccess: StaffOperationsAccessService,
    private readonly sessionRosterService: SessionRosterService,
    private readonly sessionValidationService: SessionValidationService,
    private readonly sessionStudentBalanceService: SessionStudentBalanceService,
    private readonly sessionLedgerService: SessionLedgerService,
    private readonly sessionSnapshotService: SessionSnapshotService,
    private readonly actionHistoryService: ActionHistoryService,
  ) {}

  async createSession(data: SessionCreateDto, actor?: ActionHistoryActor) {
    this.sessionValidationService.validateAttendanceItems(data.attendance, {
      required: true,
    });

    return this.prisma.$transaction(async (tx) => {
      const attendanceStudentIds = data.attendance.map(
        (attendanceItem) => attendanceItem.studentId,
      );
      const chargeableAttendanceStudentIds = data.attendance
        .filter((item) => item.status === AttendanceStatus.present)
        .map((attendanceItem) => attendanceItem.studentId);

      const classTeacher = await tx.classTeacher.findUnique({
        where: {
          classId_teacherId: {
            classId: data.classId,
            teacherId: data.teacherId,
          },
        },
        select: { customAllowance: true, class: { select: { name: true } } },
      });

      const studentCustomerCare = await tx.customerCareService.findMany({
        where: {
          studentId: {
            in: chargeableAttendanceStudentIds,
          },
        },
        select: {
          studentId: true,
          profitPercent: true,
          staffId: true,
        },
      });

      const studentClasses = await tx.studentClass.findMany({
        where: {
          studentId: {
            in: attendanceStudentIds,
          },
          classId: data.classId,
        },
        select: {
          studentId: true,
          customStudentTuitionPerSession: true,
          student: true,
        },
      });

      const customerCareByStudentId = new Map(
        studentCustomerCare.map((customerCare) => [
          customerCare.studentId,
          customerCare,
        ]),
      );
      const studentClassByStudentId = new Map(
        studentClasses.map((studentClass) => [
          studentClass.studentId,
          studentClass,
        ]),
      );
      const studentAccountBalanceByStudentId = new Map(
        studentClasses.map((studentClass) => [
          studentClass.studentId,
          studentClass.student.accountBalance,
        ]),
      );

      if (!classTeacher) {
        throw new NotFoundException(
          'Class teacher not found for this class and teacher.',
        );
      }

      const uniqueAttendanceStudentIds = new Set(attendanceStudentIds);
      if (studentClasses.length !== uniqueAttendanceStudentIds.size) {
        throw new BadRequestException(
          'attendance chỉ được phép chứa học sinh thuộc lớp học hiện tại.',
        );
      }

      const coefficient =
        this.sessionValidationService.normalizeCoefficient(data.coefficient) ??
        1.0;
      const allowanceAmount =
        data.allowanceAmount !== undefined && data.allowanceAmount !== null
          ? data.allowanceAmount
          : classTeacher.customAllowance;

      const resolvedAttendance = data.attendance.map((attendanceItem) => {
        const customerCare = customerCareByStudentId.get(
          attendanceItem.studentId,
        );

        return {
          studentId: attendanceItem.studentId,
          status: attendanceItem.status,
          notes: attendanceItem.notes ?? null,
          customerCareCoef: customerCare?.profitPercent,
          customerCareStaffId: customerCare?.staffId,
          tuitionFee:
            this.sessionValidationService.resolveChargeableAttendanceTuitionFee(
              attendanceItem.status,
              attendanceItem.tuitionFee,
              studentClassByStudentId.get(attendanceItem.studentId)
                ?.customStudentTuitionPerSession,
            ),
          accountBalance: studentAccountBalanceByStudentId.get(
            attendanceItem.studentId,
          ),
        };
      });

      const tuitionFee = resolvedAttendance.reduce(
        (sum, attendanceItem) => sum + (attendanceItem.tuitionFee ?? 0),
        0,
      );

      const attendanceWithCharge = resolvedAttendance.filter(
        (attendanceItem) => (attendanceItem.tuitionFee ?? 0) > 0,
      );

      await this.sessionStudentBalanceService.applyBalanceChanges(
        tx,
        attendanceWithCharge.map((attendanceItem) => ({
          studentId: attendanceItem.studentId,
          change: -(attendanceItem.tuitionFee ?? 0),
        })),
      );

      const studentTransactionAttendanceId = new Map<string, string>();

      if (attendanceWithCharge.length > 0) {
        const transactions =
          await tx.walletTransactionsHistory.createManyAndReturn({
            data: attendanceWithCharge.map((attendanceItem) => ({
              studentId: attendanceItem.studentId,
              amount: attendanceItem.tuitionFee ?? 0,
              type: WalletTransactionType.extend,
              note: this.sessionLedgerService.buildChargeNote({
                className: classTeacher.class.name,
                dateLabel: data.date,
                balanceBefore: attendanceItem.accountBalance ?? 0,
                amount: attendanceItem.tuitionFee ?? 0,
              }),
            })),
          });

        transactions.forEach((transaction) => {
          studentTransactionAttendanceId.set(
            transaction.studentId,
            transaction.id,
          );
        });
      }

      const createdSession = await tx.session.create({
        data: {
          classId: data.classId,
          teacherId: data.teacherId,
          coefficient,
          allowanceAmount,
          tuitionFee,
          date: this.sessionValidationService.parseSessionDate(data.date),
          startTime: data.startTime
            ? this.sessionValidationService.parseSessionTime(
                data.startTime,
                'startTime',
              )
            : null,
          endTime: data.endTime
            ? this.sessionValidationService.parseSessionTime(
                data.endTime,
                'endTime',
              )
            : null,
          notes: data.notes ?? null,
          attendance: {
            createMany: {
              data: resolvedAttendance.map((attendanceItem) => ({
                studentId: attendanceItem.studentId,
                status: attendanceItem.status,
                notes: attendanceItem.notes,
                customerCareCoef: attendanceItem.customerCareCoef,
                customerCareStaffId: attendanceItem.customerCareStaffId,
                customerCarePaymentStatus: PaymentStatus.pending,
                tuitionFee: attendanceItem.tuitionFee,
                transactionId: studentTransactionAttendanceId.get(
                  attendanceItem.studentId,
                ),
              })),
            },
          },
        },
        include: {
          attendance: true,
        },
      });

      if (actor) {
        const afterValue = await this.sessionSnapshotService.getSessionAuditSnapshot(
          tx,
          createdSession.id,
        );

        await this.actionHistoryService.recordCreate(tx, {
          actor,
          entityType: 'session',
          entityId: createdSession.id,
          description: 'Tạo buổi học',
          afterValue,
        });
      }

      return createdSession;
    });
  }

  async createSessionForStaff(
    userId: string,
    roleType: UserRole,
    classId: string,
    data: {
      date: string;
      startTime?: string;
      endTime?: string;
      notes?: string | null;
      attendance: Array<{
        studentId: string;
        status: SessionCreateDto['attendance'][number]['status'];
        notes?: string | null;
      }>;
    },
    auditActor?: ActionHistoryActor,
  ) {
    const actor = await this.staffOperationsAccess.resolveActor(userId, roleType);
    const isTeacher = actor.roles.includes(StaffRole.teacher);
    if (isTeacher) {
      await this.staffOperationsAccess.assertTeacherAssignedToClass(
        actor.id,
        classId,
      );
    }

    await this.sessionRosterService.assertAttendanceStudentsBelongToClass(
      classId,
      data.attendance.map((attendanceItem) => attendanceItem.studentId),
    );

    const teacherId = isTeacher
      ? actor.id
      : await this.staffOperationsAccess.resolveSingleTeacherForClass(classId);

    const allowance = await this.prisma.classTeacher.findUnique({
      where: {
        classId_teacherId: {
          classId,
          teacherId,
        },
      },
      select: {
        customAllowance: true,
      },
    });

    return this.createSession(
      {
        classId,
        teacherId,
        date: data.date,
        allowanceAmount: allowance?.customAllowance ?? null,
        startTime: data.startTime,
        endTime: data.endTime,
        notes: data.notes ?? null,
        attendance: data.attendance.map((attendanceItem) => ({
          studentId: attendanceItem.studentId,
          status: attendanceItem.status,
          notes: attendanceItem.notes ?? null,
        })),
      },
      auditActor,
    );
  }
}
