import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentStatus,
  SessionPaymentStatus,
  StaffRole,
  UserRole,
  WalletTransactionType,
} from '../../generated/enums';
import {
  ActionHistoryActor,
  ActionHistoryService,
} from '../action-history/action-history.service';
import {
  SessionBulkPaymentStatusUpdateResult,
  SessionUpdateDto,
} from '../dtos/session.dto';
import { PrismaService } from '../prisma/prisma.service';
import { StaffOperationsAccessService } from '../staff-ops/staff-operations-access.service';
import { SessionLedgerService } from './session-ledger.service';
import { SessionRosterService } from './session-roster.service';
import { SessionSnapshotService } from './session-snapshot.service';
import { SessionStudentBalanceService } from './session-student-balance.service';
import { SessionValidationService } from './session-validation.service';

function normalizeSessionPaymentStatus(
  value?: string | null,
): SessionPaymentStatus {
  const normalized = String(value ?? SessionPaymentStatus.unpaid).toLowerCase();

  if (normalized === SessionPaymentStatus.paid) {
    return SessionPaymentStatus.paid;
  }

  if (normalized === SessionPaymentStatus.deposit) {
    return SessionPaymentStatus.deposit;
  }

  return SessionPaymentStatus.unpaid;
}

@Injectable()
export class SessionUpdateService {
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

  async updateSessionPaymentStatuses(
    sessionIds: string[],
    teacherPaymentStatus: SessionPaymentStatus,
    actor?: ActionHistoryActor,
  ): Promise<SessionBulkPaymentStatusUpdateResult> {
    const uniqueSessionIds = Array.from(
      new Set(
        sessionIds.filter(
          (sessionId): sessionId is string =>
            typeof sessionId === 'string' && sessionId.trim().length > 0,
        ),
      ),
    );

    if (uniqueSessionIds.length === 0) {
      throw new BadRequestException('sessionIds must contain at least one id.');
    }

    return this.prisma.$transaction(async (tx) => {
      const existingSessions = await tx.session.findMany({
        where: {
          id: {
            in: uniqueSessionIds,
          },
        },
        select: {
          id: true,
          teacherPaymentStatus: true,
        },
      });

      if (existingSessions.length !== uniqueSessionIds.length) {
        const existingIds = new Set(
          existingSessions.map((session) => session.id),
        );
        const missingSessionId = uniqueSessionIds.find(
          (sessionId) => !existingIds.has(sessionId),
        );

        throw new NotFoundException(
          missingSessionId
            ? `Session not found: ${missingSessionId}`
            : 'Session not found',
        );
      }

      const changedSessionIds = existingSessions
        .filter(
          (session) =>
            normalizeSessionPaymentStatus(session.teacherPaymentStatus) !==
            teacherPaymentStatus,
        )
        .map((session) => session.id);

      if (changedSessionIds.length === 0) {
        return {
          requestedCount: uniqueSessionIds.length,
          updatedCount: 0,
        };
      }

      const beforeValueBySessionId = actor
        ? await this.sessionSnapshotService.getSessionAuditSnapshots(
            tx,
            changedSessionIds,
          )
        : new Map<string, unknown>();

      await tx.session.updateMany({
        where: {
          id: {
            in: changedSessionIds,
          },
        },
        data: {
          teacherPaymentStatus,
        },
      });

      if (actor) {
        const afterValueBySessionId =
          await this.sessionSnapshotService.getSessionAuditSnapshots(
            tx,
            changedSessionIds,
          );

        for (const sessionId of changedSessionIds) {
          await this.actionHistoryService.recordUpdate(tx, {
            actor,
            entityType: 'session',
            entityId: sessionId,
            description: 'Cập nhật trạng thái thanh toán buổi học',
            beforeValue: beforeValueBySessionId.get(sessionId) ?? null,
            afterValue: afterValueBySessionId.get(sessionId) ?? null,
          });
        }
      }

      return {
        requestedCount: uniqueSessionIds.length,
        updatedCount: changedSessionIds.length,
      };
    });
  }

  async updateSession(data: SessionUpdateDto, actor?: ActionHistoryActor) {
    if (!data.id) {
      throw new BadRequestException('Session id is required');
    }

    this.sessionValidationService.validateAttendanceItems(data.attendance, {
      required: false,
    });

    const sessionId = data.id;

    return this.prisma.$transaction(async (tx) => {
      const beforeValue = actor
        ? await this.sessionSnapshotService.getSessionAuditSnapshot(
            tx,
            sessionId,
          )
        : null;
      const existingSession = await tx.session.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          classId: true,
          teacherId: true,
          date: true,
          class: {
            select: {
              name: true,
            },
          },
          attendance: {
            select: {
              id: true,
              studentId: true,
              status: true,
              notes: true,
              tuitionFee: true,
              customerCareCoef: true,
              customerCareStaffId: true,
              customerCarePaymentStatus: true,
              assistantManagerStaffId: true,
              assistantPaymentStatus: true,
              transactionId: true,
              transaction: {
                select: {
                  id: true,
                  amount: true,
                },
              },
              student: {
                select: {
                  accountBalance: true,
                },
              },
            },
          },
        },
      });

      if (!existingSession) {
        throw new NotFoundException('Session not found');
      }

      const nextClassId = data.classId ?? existingSession.classId;
      const nextTeacherId = data.teacherId ?? existingSession.teacherId;
      const hasClassOrTeacherChange =
        nextClassId !== existingSession.classId ||
        nextTeacherId !== existingSession.teacherId;
      const shouldRebuildAttendanceState =
        data.attendance !== undefined ||
        nextClassId !== existingSession.classId;

      const existingAttendanceByStudentId = new Map(
        existingSession.attendance.map((attendanceItem) => [
          attendanceItem.studentId,
          attendanceItem,
        ]),
      );

      const sessionDate =
        data.date !== undefined
          ? this.sessionValidationService.parseSessionDate(data.date)
          : undefined;
      const sessionStartTime =
        data.startTime !== undefined
          ? this.sessionValidationService.parseSessionTime(
              data.startTime,
              'startTime',
            )
          : undefined;
      const sessionEndTime =
        data.endTime !== undefined
          ? this.sessionValidationService.parseSessionTime(
              data.endTime,
              'endTime',
            )
          : undefined;

      const coefficientUpdate =
        this.sessionValidationService.normalizeCoefficient(data.coefficient);

      let allowanceAmountUpdate: number | null | undefined;
      let nextClassName = existingSession.class.name;
      if (hasClassOrTeacherChange) {
        const classTeacher = await tx.classTeacher.findUnique({
          where: {
            classId_teacherId: {
              classId: nextClassId,
              teacherId: nextTeacherId,
            },
          },
          select: {
            customAllowance: true,
            class: {
              select: {
                name: true,
              },
            },
          },
        });

        if (!classTeacher) {
          throw new NotFoundException(
            'Class teacher not found for this class and teacher.',
          );
        }

        nextClassName = classTeacher.class.name;
        allowanceAmountUpdate =
          data.allowanceAmount !== undefined
            ? data.allowanceAmount
            : classTeacher.customAllowance;
      } else if (data.allowanceAmount !== undefined) {
        allowanceAmountUpdate = data.allowanceAmount;
      }

      const attendanceSource =
        data.attendance ??
        existingSession.attendance.map((attendanceItem) => ({
          studentId: attendanceItem.studentId,
          status: attendanceItem.status,
          notes: attendanceItem.notes ?? null,
          tuitionFee: attendanceItem.tuitionFee ?? null,
        }));

      const nextAttendanceStudentIds = attendanceSource.map(
        (attendanceItem) => attendanceItem.studentId,
      );
      const chargeableAttendanceStudentIds = attendanceSource
        .filter((item) =>
          this.sessionValidationService.isTuitionChargeableStatus(item.status),
        )
        .map((attendanceItem) => attendanceItem.studentId);

      const studentTuitionFeeByStudentId = new Map<string, number | null>();
      if (shouldRebuildAttendanceState && nextAttendanceStudentIds.length > 0) {
        const studentClasses = await tx.studentClass.findMany({
          where: {
            classId: nextClassId,
            studentId: {
              in: nextAttendanceStudentIds,
            },
          },
          select: {
            studentId: true,
            customStudentTuitionPerSession: true,
          },
        });

        studentClasses.forEach((studentClass) => {
          studentTuitionFeeByStudentId.set(
            studentClass.studentId,
            studentClass.customStudentTuitionPerSession ?? null,
          );
        });

        const uniqueAttendanceStudentIds = new Set(nextAttendanceStudentIds);
        if (studentClasses.length !== uniqueAttendanceStudentIds.size) {
          throw new BadRequestException(
            'attendance chỉ được phép chứa học sinh thuộc lớp học hiện tại.',
          );
        }
      }

      const customerCareByStudentId = new Map<
        string,
        { profitPercent: number | null; staffId: string | null }
      >();
      if (
        data.attendance !== undefined &&
        chargeableAttendanceStudentIds.length > 0
      ) {
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

        studentCustomerCare.forEach((customerCare) => {
          customerCareByStudentId.set(customerCare.studentId, {
            profitPercent:
              customerCare.profitPercent === null
                ? null
                : Number(customerCare.profitPercent),
            staffId: customerCare.staffId ?? null,
          });
        });
      }

      const assistantManagerByStaffId = new Map<string, string | null>();
      if (data.attendance !== undefined) {
        const uniqueCareStaffIds = [
          ...new Set(
            [...customerCareByStudentId.values()]
              .map((cc) => cc.staffId)
              .filter((id): id is string => !!id),
          ),
        ];
        if (uniqueCareStaffIds.length > 0) {
          const careStaff = await tx.staffInfo.findMany({
            where: { id: { in: uniqueCareStaffIds } },
            select: { id: true, customerCareManagedByStaffId: true },
          });
          careStaff.forEach((s) =>
            assistantManagerByStaffId.set(
              s.id,
              s.customerCareManagedByStaffId,
            ),
          );
        }
      }

      const nextAttendanceState = shouldRebuildAttendanceState
        ? attendanceSource.map((attendanceItem) => {
            const existingAttendance = existingAttendanceByStudentId.get(
              attendanceItem.studentId,
            );
            const defaultTuitionFee =
              studentTuitionFeeByStudentId.get(attendanceItem.studentId) ??
              null;
            const resolvedTuitionFee =
              data.attendance !== undefined
                ? this.sessionValidationService.resolveChargeableAttendanceTuitionFee(
                    attendanceItem.status,
                    attendanceItem.tuitionFee,
                    defaultTuitionFee,
                  )
                : nextClassId !== existingSession.classId
                  ? this.sessionValidationService.resolveChargeableAttendanceTuitionFee(
                      attendanceItem.status,
                      undefined,
                      defaultTuitionFee,
                    )
                  : this.sessionValidationService.resolveChargeableAttendanceTuitionFee(
                      attendanceItem.status,
                      existingAttendance?.tuitionFee ?? null,
                      null,
                    );

            const resolvedCareStaffId =
              data.attendance !== undefined
                ? (customerCareByStudentId.get(attendanceItem.studentId)
                    ?.staffId ?? null)
                : (existingAttendance?.customerCareStaffId ?? null);

            const resolvedAssistantId =
              data.attendance !== undefined
                ? (resolvedCareStaffId
                    ? (assistantManagerByStaffId.get(resolvedCareStaffId) ??
                      null)
                    : null)
                : (existingAttendance?.assistantManagerStaffId ?? null);

            return {
              studentId: attendanceItem.studentId,
              status: attendanceItem.status,
              notes: attendanceItem.notes ?? null,
              tuitionFee: resolvedTuitionFee,
              customerCareCoef:
                data.attendance !== undefined
                  ? (customerCareByStudentId.get(attendanceItem.studentId)
                      ?.profitPercent ?? null)
                  : (existingAttendance?.customerCareCoef ?? null),
              customerCareStaffId: resolvedCareStaffId,
              assistantManagerStaffId: resolvedAssistantId,
              existingAttendanceId: existingAttendance?.id ?? null,
              existingTransactionId: existingAttendance?.transactionId ?? null,
              existingCustomerCarePaymentStatus:
                existingAttendance?.customerCarePaymentStatus ?? null,
              existingAssistantPaymentStatus:
                existingAttendance?.assistantPaymentStatus ?? null,
            };
          })
        : [];

      const nextAttendanceStateByStudentId = new Map(
        nextAttendanceState.map((attendanceItem) => [
          attendanceItem.studentId,
          attendanceItem,
        ]),
      );
      const sessionTuitionFeeUpdate = shouldRebuildAttendanceState
        ? nextAttendanceState.reduce(
            (sum, attendanceItem) => sum + (attendanceItem.tuitionFee ?? 0),
            0,
          )
        : undefined;

      const balanceStudentIds = Array.from(
        new Set([
          ...existingSession.attendance.map(
            (attendanceItem) => attendanceItem.studentId,
          ),
          ...nextAttendanceStudentIds,
        ]),
      );
      const studentBalanceByStudentId = new Map<string, number | null>();
      if (balanceStudentIds.length > 0) {
        const students = await tx.studentInfo.findMany({
          where: {
            id: {
              in: balanceStudentIds,
            },
          },
          select: {
            id: true,
            accountBalance: true,
          },
        });

        students.forEach((student) => {
          studentBalanceByStudentId.set(student.id, student.accountBalance);
        });
      }

      const getCurrentStudentBalance = (studentId: string) =>
        studentBalanceByStudentId.get(studentId) ?? 0;

      const oldSessionDateLabel = existingSession.date
        .toISOString()
        .slice(0, 10);
      const nextSessionDateLabel = (sessionDate ?? existingSession.date)
        .toISOString()
        .slice(0, 10);

      const refundHistoryItems: Array<{
        studentId: string;
        amount: number;
        balanceBefore: number;
        className: string;
        dateLabel: string;
      }> = [];
      const chargeHistoryItems: Array<{
        studentId: string;
        amount: number;
        balanceBefore: number;
        className: string;
        dateLabel: string;
      }> = [];
      const attendanceIdsToDelete: string[] = [];

      if (shouldRebuildAttendanceState) {
        existingSession.attendance.forEach((attendanceItem) => {
          if (nextAttendanceStateByStudentId.has(attendanceItem.studentId)) {
            return;
          }

          attendanceIdsToDelete.push(attendanceItem.id);

          const oldChargeAmount =
            this.sessionLedgerService.getAttendanceChargeAmount(attendanceItem);
          if (oldChargeAmount <= 0) {
            return;
          }

          refundHistoryItems.push({
            studentId: attendanceItem.studentId,
            amount: oldChargeAmount,
            balanceBefore: getCurrentStudentBalance(attendanceItem.studentId),
            className: existingSession.class.name,
            dateLabel: oldSessionDateLabel,
          });
        });

        nextAttendanceState.forEach((attendanceItem) => {
          const existingAttendance = existingAttendanceByStudentId.get(
            attendanceItem.studentId,
          );
          const oldChargeAmount =
            this.sessionLedgerService.getAttendanceChargeAmount(
              existingAttendance,
            );
          const newChargeAmount =
            this.sessionLedgerService.getAttendanceChargeAmount(attendanceItem);
          const balanceBefore = getCurrentStudentBalance(
            attendanceItem.studentId,
          );

          if (existingAttendance && oldChargeAmount !== newChargeAmount) {
            if (oldChargeAmount > 0) {
              refundHistoryItems.push({
                studentId: attendanceItem.studentId,
                amount: oldChargeAmount,
                balanceBefore,
                className: existingSession.class.name,
                dateLabel: oldSessionDateLabel,
              });
            }

            if (newChargeAmount > 0) {
              chargeHistoryItems.push({
                studentId: attendanceItem.studentId,
                amount: newChargeAmount,
                balanceBefore: balanceBefore + oldChargeAmount,
                className: nextClassName,
                dateLabel: nextSessionDateLabel,
              });
            }

            return;
          }

          if (!existingAttendance && newChargeAmount > 0) {
            chargeHistoryItems.push({
              studentId: attendanceItem.studentId,
              amount: newChargeAmount,
              balanceBefore,
              className: nextClassName,
              dateLabel: nextSessionDateLabel,
            });
          }
        });
      }

      const studentBalanceDeltaByStudentId = new Map<string, number>();
      refundHistoryItems.forEach((refundItem) => {
        studentBalanceDeltaByStudentId.set(
          refundItem.studentId,
          (studentBalanceDeltaByStudentId.get(refundItem.studentId) ?? 0) +
            refundItem.amount,
        );
      });
      chargeHistoryItems.forEach((chargeItem) => {
        studentBalanceDeltaByStudentId.set(
          chargeItem.studentId,
          (studentBalanceDeltaByStudentId.get(chargeItem.studentId) ?? 0) -
            chargeItem.amount,
        );
      });

      await tx.session.update({
        where: { id: sessionId },
        data: {
          ...(data.classId !== undefined && { classId: data.classId }),
          ...(data.teacherId !== undefined && { teacherId: data.teacherId }),
          ...(sessionDate !== undefined && { date: sessionDate }),
          ...(sessionStartTime !== undefined && {
            startTime: sessionStartTime,
          }),
          ...(sessionEndTime !== undefined && { endTime: sessionEndTime }),
          ...(data.notes !== undefined && { notes: data.notes ?? null }),
          ...(data.teacherPaymentStatus !== undefined && {
            teacherPaymentStatus: data.teacherPaymentStatus ?? 'unpaid',
          }),
          ...(coefficientUpdate !== undefined && {
            coefficient: coefficientUpdate,
          }),
          ...(allowanceAmountUpdate !== undefined && {
            allowanceAmount: allowanceAmountUpdate,
          }),
          ...(sessionTuitionFeeUpdate !== undefined && {
            tuitionFee: sessionTuitionFeeUpdate,
          }),
        },
      });

      const balanceChanges = Array.from(
        studentBalanceDeltaByStudentId.entries(),
      )
        .map(([studentId, change]) => ({
          studentId,
          change,
        }))
        .filter((balanceChange) => balanceChange.change !== 0);
      await this.sessionStudentBalanceService.applyBalanceChanges(
        tx,
        balanceChanges,
      );

      if (refundHistoryItems.length > 0) {
        await tx.walletTransactionsHistory.createMany({
          data: refundHistoryItems.map((refundItem) => ({
            studentId: refundItem.studentId,
            type: WalletTransactionType.topup,
            amount: refundItem.amount,
            note: this.sessionLedgerService.buildRefundNote(refundItem),
          })),
        });
      }

      const nextChargeTransactionIdByStudentId = new Map<string, string>();
      if (chargeHistoryItems.length > 0) {
        const chargeTransactions =
          await tx.walletTransactionsHistory.createManyAndReturn({
            data: chargeHistoryItems.map((chargeItem) => ({
              studentId: chargeItem.studentId,
              amount: chargeItem.amount,
              type: WalletTransactionType.repayment,
              note: this.sessionLedgerService.buildChargeNote(chargeItem),
            })),
          });

        chargeTransactions.forEach((transaction) => {
          nextChargeTransactionIdByStudentId.set(
            transaction.studentId,
            transaction.id,
          );
        });
      }

      if (attendanceIdsToDelete.length > 0) {
        await tx.attendance.deleteMany({
          where: {
            id: {
              in: attendanceIdsToDelete,
            },
          },
        });
      }

      if (shouldRebuildAttendanceState) {
        await Promise.all(
          nextAttendanceState.map((attendanceItem) => {
            const existingAttendance = existingAttendanceByStudentId.get(
              attendanceItem.studentId,
            );
            const oldChargeAmount =
              this.sessionLedgerService.getAttendanceChargeAmount(
                existingAttendance,
              );
            const newChargeAmount =
              this.sessionLedgerService.getAttendanceChargeAmount(
                attendanceItem,
              );
            const transactionId =
              oldChargeAmount === newChargeAmount
                ? (existingAttendance?.transactionId ?? null)
                : (nextChargeTransactionIdByStudentId.get(
                    attendanceItem.studentId,
                  ) ?? null);

            return tx.attendance.upsert({
              where: {
                sessionId_studentId: {
                  sessionId,
                  studentId: attendanceItem.studentId,
                },
              },
              create: {
                sessionId,
                studentId: attendanceItem.studentId,
                status: attendanceItem.status,
                notes: attendanceItem.notes,
                customerCareCoef: attendanceItem.customerCareCoef,
                customerCareStaffId: attendanceItem.customerCareStaffId,
                customerCarePaymentStatus: PaymentStatus.pending,
                tuitionFee: attendanceItem.tuitionFee,
                transactionId,
                assistantManagerStaffId:
                  attendanceItem.assistantManagerStaffId,
                assistantPaymentStatus:
                  attendanceItem.assistantManagerStaffId
                    ? PaymentStatus.pending
                    : null,
              },
              update: {
                status: attendanceItem.status,
                notes: attendanceItem.notes,
                customerCareCoef:
                  data.attendance !== undefined
                    ? attendanceItem.customerCareCoef
                    : undefined,
                customerCareStaffId:
                  data.attendance !== undefined
                    ? attendanceItem.customerCareStaffId
                    : undefined,
                tuitionFee: attendanceItem.tuitionFee,
                transactionId,
                assistantManagerStaffId:
                  data.attendance !== undefined
                    ? attendanceItem.assistantManagerStaffId
                    : undefined,
                assistantPaymentStatus:
                  data.attendance !== undefined
                    ? (attendanceItem.assistantManagerStaffId
                        ? PaymentStatus.pending
                        : null)
                    : undefined,
              },
            });
          }),
        );
      }

      const updatedSession = await tx.session.findUnique({
        where: { id: sessionId },
        include: { attendance: true },
      });

      if (!updatedSession) {
        throw new NotFoundException('Session not found');
      }

      if (actor) {
        const afterValue =
          await this.sessionSnapshotService.getSessionAuditSnapshot(
            tx,
            sessionId,
          );

        await this.actionHistoryService.recordUpdate(tx, {
          actor,
          entityType: 'session',
          entityId: sessionId,
          description: 'Cập nhật buổi học',
          beforeValue,
          afterValue,
        });
      }

      return updatedSession;
    });
  }

  async updateSessionForStaff(
    userId: string,
    roleType: UserRole,
    sessionId: string,
    data: {
      date?: string;
      startTime?: string;
      endTime?: string;
      notes?: string | null;
      coefficient?: number;
      attendance?: Array<{
        studentId: string;
        status: NonNullable<SessionUpdateDto['attendance']>[number]['status'];
        notes?: string | null;
      }>;
    },
    auditActor?: ActionHistoryActor,
  ) {
    const existingSession = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        classId: true,
        attendance: {
          select: {
            studentId: true,
            tuitionFee: true,
          },
        },
      },
    });

    if (!existingSession) {
      throw new NotFoundException('Session not found');
    }

    const actor = await this.staffOperationsAccess.resolveActor(
      userId,
      roleType,
    );
    if (actor.roles.includes(StaffRole.teacher)) {
      await this.staffOperationsAccess.assertTeacherAssignedToClass(
        actor.id,
        existingSession.classId,
      );
    }

    let enrichedAttendance: SessionUpdateDto['attendance'] | undefined;
    if (data.attendance !== undefined) {
      const tuitionByStudentId =
        await this.sessionRosterService.assertAttendanceStudentsBelongToClass(
          existingSession.classId,
          data.attendance.map((attendanceItem) => attendanceItem.studentId),
        );
      const existingAttendanceByStudentId = new Map(
        existingSession.attendance.map((attendanceItem) => [
          attendanceItem.studentId,
          attendanceItem.tuitionFee ?? null,
        ]),
      );

      enrichedAttendance = data.attendance.map((attendanceItem) => ({
        studentId: attendanceItem.studentId,
        status: attendanceItem.status,
        notes: attendanceItem.notes ?? null,
        tuitionFee:
          this.sessionValidationService.resolveChargeableAttendanceTuitionFee(
            attendanceItem.status,
            existingAttendanceByStudentId.get(attendanceItem.studentId) ?? null,
            tuitionByStudentId.get(attendanceItem.studentId) ?? null,
          ),
      }));
    }

    return this.updateSession(
      {
        id: sessionId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        notes: data.notes,
        coefficient: data.coefficient,
        attendance: enrichedAttendance,
      },
      auditActor,
    );
  }
}
