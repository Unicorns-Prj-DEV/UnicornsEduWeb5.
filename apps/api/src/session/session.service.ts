import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/client';
import { PaymentStatus, WalletTransactionType } from 'generated/client';
import { SessionCreateDto, SessionUpdateDto } from 'src/dtos/session.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  private parseSessionDate(date: string) {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('date không hợp lệ.');
    }
    return parsedDate;
  }

  private formatVND(amount: number) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  private parseSessionTime(time: string, field: 'startTime' | 'endTime') {
    const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(time);

    if (!timeMatch) {
      throw new BadRequestException(`${field} không hợp lệ.`);
    }

    const hours = Number.parseInt(timeMatch[1], 10);
    const minutes = Number.parseInt(timeMatch[2], 10);
    const seconds =
      timeMatch[3] !== undefined ? Number.parseInt(timeMatch[3], 10) : 0;

    const normalizedTime = `${String(hours).padStart(2, '0')}:${String(
      minutes,
    ).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const parsedTime = new Date(`1970-01-01T${normalizedTime}`);
    if (Number.isNaN(parsedTime.getTime())) {
      throw new BadRequestException(`${field} không hợp lệ.`);
    }

    return parsedTime;
  }

  private validateAttendanceItems(
    attendance:
      | Array<{ studentId: string; tuitionFee?: number | null }>
      | undefined,
    options: { required: boolean },
  ) {
    if (attendance === undefined) {
      if (options.required) {
        throw new BadRequestException('attendance là bắt buộc.');
      }
      return;
    }

    if (!Array.isArray(attendance)) {
      throw new BadRequestException('attendance phải là mảng hợp lệ.');
    }

    const studentIds = attendance.map((item) => item?.studentId);
    const hasInvalidStudentId = studentIds.some(
      (studentId) =>
        typeof studentId !== 'string' || studentId.trim().length === 0,
    );

    if (hasInvalidStudentId) {
      throw new BadRequestException('attendance.studentId không hợp lệ.');
    }

    const uniqueStudentIds = new Set(studentIds);
    if (uniqueStudentIds.size !== studentIds.length) {
      throw new BadRequestException('attendance chứa studentId trùng lặp.');
    }

    const hasInvalidTuitionFee = attendance.some((item) => {
      if (item?.tuitionFee === undefined || item?.tuitionFee === null) {
        return false;
      }

      const tuitionFee = Number(item.tuitionFee);
      return !Number.isFinite(tuitionFee) || tuitionFee < 0;
    });

    if (hasInvalidTuitionFee) {
      throw new BadRequestException('attendance.tuitionFee không hợp lệ.');
    }
  }

  private normalizeAttendanceTuitionFee(
    value: number | string | null | undefined,
  ): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const normalizedValue = Number(value);
    if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
      throw new BadRequestException('attendance.tuitionFee không hợp lệ.');
    }

    return Math.floor(normalizedValue);
  }

  private resolveAttendanceTuitionFee(
    overrideValue: number | string | null | undefined,
    defaultValue: number | null | undefined,
  ): number | null {
    const normalizedOverride =
      this.normalizeAttendanceTuitionFee(overrideValue);
    if (normalizedOverride !== null) {
      return normalizedOverride;
    }

    return this.normalizeAttendanceTuitionFee(defaultValue);
  }

  async createSession(data: SessionCreateDto) {
    this.validateAttendanceItems(data.attendance, { required: true });

    const createdSession = await this.prisma.$transaction(async (tx) => {
      const attendanceStudentIds = data.attendance.map(
        (attendanceItem) => attendanceItem.studentId,
      );

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
            in: attendanceStudentIds,
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

      const coefficient =
        data.coefficient !== undefined && Number.isFinite(data.coefficient)
          ? Math.max(0.1, Math.min(9.9, Number(data.coefficient)))
          : 1.0;
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
          tuitionFee: studentClassByStudentId.get(attendanceItem.studentId)
            ?.customStudentTuitionPerSession,
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

      await Promise.all(
        attendanceWithCharge.map((attendanceItem) =>
          tx.studentInfo.update({
            where: { id: attendanceItem.studentId },
            data: {
              accountBalance: {
                decrement: attendanceItem.tuitionFee ?? 0,
              },
            },
          }),
        ),
      );

      const studentTransactionAttendanceId = new Map<string, string>();

      if (attendanceWithCharge.length > 0) {
        const transactions =
          await tx.walletTransactionsHistory.createManyAndReturn({
            data: resolvedAttendance.map((attendanceItem) => ({
              studentId: attendanceItem.studentId,
              amount: attendanceItem.tuitionFee ?? 0,
              type: WalletTransactionType.extend,
              note: `Đóng học phí lớp ${classTeacher.class.name} buổi học ${data.date}. | Số dư: ${this.formatVND(attendanceItem.accountBalance ?? 0)} - ${this.formatVND(attendanceItem.tuitionFee ?? 0)} = ${this.formatVND((attendanceItem.accountBalance ?? 0) - (attendanceItem.tuitionFee ?? 0))}`,
            })),
          });

        transactions.forEach((transaction) => {
          studentTransactionAttendanceId.set(
            transaction.studentId,
            transaction.id,
          );
        });
      }

      return tx.session.create({
        data: {
          classId: data.classId,
          teacherId: data.teacherId,
          coefficient,
          allowanceAmount,
          tuitionFee,
          date: this.parseSessionDate(data.date),
          startTime: data.startTime
            ? this.parseSessionTime(data.startTime, 'startTime')
            : null,
          endTime: data.endTime
            ? this.parseSessionTime(data.endTime, 'endTime')
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
    });

    return createdSession;
  }

  async updateSession(data: SessionUpdateDto) {
    if (!data.id) {
      throw new BadRequestException('Session id is required');
    }

    this.validateAttendanceItems(data.attendance, { required: false });

    const sessionId = data.id;

    return this.prisma.$transaction(async (tx) => {
      const existingSession = await tx.session.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          classId: true,
          teacherId: true,
          attendance: {
            select: {
              id: true,
              studentId: true,
              status: true,
              notes: true,
              tuitionFee: true,
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

      const sessionDate =
        data.date !== undefined ? this.parseSessionDate(data.date) : undefined;
      const sessionStartTime =
        data.startTime !== undefined
          ? this.parseSessionTime(data.startTime, 'startTime')
          : undefined;
      const sessionEndTime =
        data.endTime !== undefined
          ? this.parseSessionTime(data.endTime, 'endTime')
          : undefined;

      const coefficientUpdate =
        data.coefficient !== undefined && Number.isFinite(data.coefficient)
          ? Math.max(0.1, Math.min(9.9, Number(data.coefficient)))
          : undefined;

      let allowanceAmountUpdate: number | null | undefined = undefined;
      if (hasClassOrTeacherChange) {
        const classTeacher = await tx.classTeacher.findUnique({
          where: {
            classId_teacherId: {
              classId: nextClassId,
              teacherId: nextTeacherId,
            },
          },
          select: { customAllowance: true },
        });

        if (!classTeacher) {
          throw new NotFoundException(
            'Class teacher not found for this class and teacher.',
          );
        }

        allowanceAmountUpdate =
          data.allowanceAmount !== undefined
            ? data.allowanceAmount
            : classTeacher.customAllowance;
      } else if (data.allowanceAmount !== undefined) {
        allowanceAmountUpdate = data.allowanceAmount;
      }

      const effectiveAttendance =
        data.attendance ??
        existingSession.attendance.map((attendanceItem) => ({
          studentId: attendanceItem.studentId,
          status: attendanceItem.status,
          notes: attendanceItem.notes ?? null,
          tuitionFee: attendanceItem.tuitionFee ?? null,
        }));

      const effectiveAttendanceStudentIds = effectiveAttendance.map(
        (attendanceItem) => attendanceItem.studentId,
      );
      const shouldRefreshAttendanceTuition =
        data.attendance !== undefined ||
        nextClassId !== existingSession.classId;

      const studentTuitionFeeByStudentId = new Map<string, number | null>();
      if (
        shouldRefreshAttendanceTuition &&
        effectiveAttendanceStudentIds.length > 0
      ) {
        const studentClasses = await tx.studentClass.findMany({
          where: {
            classId: nextClassId,
            studentId: {
              in: effectiveAttendanceStudentIds,
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
      }

      const customerCareByStudentId = new Map<
        string,
        { profitPercent: number | null; staffId: string | null }
      >();
      if (
        data.attendance !== undefined &&
        effectiveAttendanceStudentIds.length > 0
      ) {
        const studentCustomerCare = await tx.customerCareService.findMany({
          where: {
            studentId: {
              in: effectiveAttendanceStudentIds,
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

      const sessionTuitionFeeUpdate = shouldRefreshAttendanceTuition
        ? effectiveAttendance.reduce((sum, attendanceItem) => {
            return (
              sum +
              (this.resolveAttendanceTuitionFee(
                attendanceItem.tuitionFee,
                studentTuitionFeeByStudentId.get(attendanceItem.studentId) ??
                  null,
              ) ?? 0)
            );
          }, 0)
        : undefined;

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

      if (data.attendance !== undefined) {
        const incomingStudentIds = new Set(
          data.attendance.map((attendanceItem) => attendanceItem.studentId),
        );

        const attendanceIdsToDelete = existingSession.attendance
          .filter(
            (attendanceItem) =>
              !incomingStudentIds.has(attendanceItem.studentId),
          )
          .map((attendanceItem) => attendanceItem.id);

        if (attendanceIdsToDelete.length > 0) {
          await tx.attendance.deleteMany({
            where: {
              id: {
                in: attendanceIdsToDelete,
              },
            },
          });
        }

        await Promise.all(
          data.attendance.map((attendanceItem) =>
            tx.attendance.upsert({
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
                notes: attendanceItem.notes ?? null,
                customerCareCoef:
                  customerCareByStudentId.get(attendanceItem.studentId)
                    ?.profitPercent ?? null,
                customerCareStaffId:
                  customerCareByStudentId.get(attendanceItem.studentId)
                    ?.staffId ?? null,
                customerCarePaymentStatus: PaymentStatus.pending,
                tuitionFee: this.resolveAttendanceTuitionFee(
                  attendanceItem.tuitionFee,
                  studentTuitionFeeByStudentId.get(attendanceItem.studentId) ??
                    null,
                ),
              },
              update: {
                status: attendanceItem.status,
                notes: attendanceItem.notes ?? null,
                customerCareCoef:
                  customerCareByStudentId.get(attendanceItem.studentId)
                    ?.profitPercent ?? null,
                customerCareStaffId:
                  customerCareByStudentId.get(attendanceItem.studentId)
                    ?.staffId ?? null,
                tuitionFee: this.resolveAttendanceTuitionFee(
                  attendanceItem.tuitionFee,
                  studentTuitionFeeByStudentId.get(attendanceItem.studentId) ??
                    null,
                ),
              },
            }),
          ),
        );
      } else if (
        shouldRefreshAttendanceTuition &&
        existingSession.attendance.length > 0
      ) {
        await Promise.all(
          existingSession.attendance.map((attendanceItem) =>
            tx.attendance.update({
              where: {
                sessionId_studentId: {
                  sessionId,
                  studentId: attendanceItem.studentId,
                },
              },
              data: {
                tuitionFee:
                  studentTuitionFeeByStudentId.get(attendanceItem.studentId) ??
                  null,
              },
            }),
          ),
        );
      }

      const updatedSession = await tx.session.findUnique({
        where: { id: sessionId },
        include: { attendance: true },
      });

      if (!updatedSession) {
        throw new NotFoundException('Session not found');
      }

      return updatedSession;
    });
  }

  async deleteSession(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const existingSession = await tx.session.findUnique({
        where: { id },
        include: {
          class: { select: { name: true } },
          attendance: {
            include: {
              student: { select: { accountBalance: true } },
              transaction: true,
            },
          },
        },
      });

      if (!existingSession) {
        throw new NotFoundException('Session not found');
      }

      const sessionDateLabel = existingSession.date.toISOString().slice(0, 10);
      const studentBalanceChanges = Array.from(
        existingSession.attendance
          .reduce((acc, attendanceItem) => {
            const changeAmount = Math.max(
              0,
              attendanceItem.transaction?.amount ??
                attendanceItem.tuitionFee ??
                0,
            );

            if (changeAmount <= 0) {
              return acc;
            }

            const currentItem = acc.get(attendanceItem.studentId);
            acc.set(attendanceItem.studentId, {
              studentId: attendanceItem.studentId,
              change: (currentItem?.change ?? 0) + changeAmount,
              accountBalance:
                currentItem?.accountBalance ??
                attendanceItem.student.accountBalance ??
                0,
            });
            return acc;
          }, new Map<string, { studentId: string; change: number; accountBalance: number }>())
          .values(),
      );

      if (studentBalanceChanges.length > 0) {
        const balanceRows = studentBalanceChanges.map(
          (balanceChange) =>
            Prisma.sql`(${balanceChange.studentId}::text, ${balanceChange.change}::integer)`,
        );

        await tx.$executeRaw(Prisma.sql`
          UPDATE student_info AS s
          SET account_balance = COALESCE(s.account_balance, 0) + balance_change.change
          FROM (
            VALUES ${Prisma.join(balanceRows)}
          ) AS balance_change(student_id, change)
          WHERE s.id = balance_change.student_id
        `);

        await tx.walletTransactionsHistory.createMany({
          data: studentBalanceChanges.map((balanceChange) => ({
            studentId: balanceChange.studentId,
            type: WalletTransactionType.topup,
            amount: balanceChange.change,
            note: `Hoàn trả số dư lớp ${existingSession.class.name} buổi học ${sessionDateLabel}. | Số dư: ${this.formatVND(balanceChange.accountBalance)} + ${this.formatVND(balanceChange.change)} = ${this.formatVND(balanceChange.accountBalance + balanceChange.change)}`,
          })),
        });
      }

      return tx.session.delete({
        where: { id },
      });
    });
  }

  private buildMonthRange(month: string, year: string) {
    const monthValue = Number.parseInt(month, 10);
    const yearValue = Number.parseInt(year, 10);

    const isInvalidMonth =
      !Number.isInteger(monthValue) || monthValue < 1 || monthValue > 12;
    const isInvalidYear =
      !Number.isInteger(yearValue) || yearValue < 1970 || yearValue > 2100;

    if (isInvalidMonth || isInvalidYear) {
      throw new BadRequestException('month/year không hợp lệ.');
    }

    const monthIndex = monthValue - 1;
    const start = new Date(yearValue, monthIndex, 1);
    const end = new Date(yearValue, monthIndex + 1, 1);

    return {
      start,
      end,
    };
  }

  async getSessionsByClassId(classId: string, month: string, year: string) {
    const range = this.buildMonthRange(month, year);

    const sessions = await this.prisma.session.findMany({
      where: {
        classId,
        date: {
          gte: range.start,
          lt: range.end,
        },
      },
      include: {
        teacher: true,
        attendance: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return sessions;
  }

  async getSessionsByTeacherId(teacherId: string, month: string, year: string) {
    const range = this.buildMonthRange(month, year);

    const sessions = await this.prisma.session.findMany({
      where: {
        teacherId,
        date: {
          gte: range.start,
          lt: range.end,
        },
      },
      include: {
        class: true,
        attendance: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return sessions;
  }
}
