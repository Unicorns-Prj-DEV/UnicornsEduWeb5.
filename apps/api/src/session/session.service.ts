import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/client';
import { PaymentStatus, WalletTransactionType } from 'generated/client';
import { StaffRole, UserRole } from 'generated/enums';
import {
  SessionCreateDto,
  SessionUnpaidSummaryItem,
  SessionUpdateDto,
} from 'src/dtos/session.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) { }

  private async getStaffOperationsActor(userId: string, roleType: UserRole) {
    if (roleType === UserRole.admin) {
      return {
        id: userId,
        roles: [] as StaffRole[],
      };
    }

    if (roleType !== UserRole.staff) {
      throw new ForbiddenException(
        'Chỉ tài khoản staff mới được dùng màn quản lý lớp học cho teacher.',
      );
    }

    const staff = await this.prisma.staffInfo.findFirst({
      where: { userId },
      select: {
        id: true,
        roles: true,
      },
    });

    if (!staff) {
      throw new ForbiddenException(
        'Chỉ nhân sự có hồ sơ staff mới được dùng màn vận hành lớp học.',
      );
    }

    if (!staff.roles.includes(StaffRole.teacher)) {
      throw new ForbiddenException(
        'Màn /staff hiện chỉ mở cho staff có role teacher.',
      );
    }

    return staff;
  }

  private async assertTeacherAssignedToClass(teacherId: string, classId: string) {
    const assignment = await this.prisma.classTeacher.findUnique({
      where: {
        classId_teacherId: {
          classId,
          teacherId,
        },
      },
      select: {
        teacherId: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Class not found');
    }
  }

  private async assertAttendanceStudentsBelongToClass(
    classId: string,
    studentIds: string[],
  ) {
    if (studentIds.length === 0) {
      throw new BadRequestException('attendance là bắt buộc.');
    }

    const uniqueStudentIds = Array.from(new Set(studentIds));
    const studentRows = await this.prisma.studentClass.findMany({
      where: {
        classId,
        studentId: {
          in: uniqueStudentIds,
        },
      },
      select: {
        studentId: true,
        customStudentTuitionPerSession: true,
      },
    });

    if (studentRows.length !== uniqueStudentIds.length) {
      throw new BadRequestException(
        'attendance chỉ được phép chứa học sinh thuộc lớp học hiện tại.',
      );
    }

    return new Map(
      studentRows.map((studentRow) => [
        studentRow.studentId,
        studentRow.customStudentTuitionPerSession ?? null,
      ]),
    );
  }

  private async resolveSingleTeacherForClass(classId: string) {
    const classTeachers = await this.prisma.classTeacher.findMany({
      where: { classId },
      select: {
        teacherId: true,
      },
    });

    if (classTeachers.length !== 1) {
      throw new BadRequestException(
        'Lớp phải có đúng 1 gia sư phụ trách trước khi Staff có thể tạo buổi học.',
      );
    }

    return classTeachers[0].teacherId;
  }

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
  ) {
    const actor = await this.getStaffOperationsActor(userId, roleType);
    const isTeacher = actor.roles.includes(StaffRole.teacher);
    if (isTeacher) {
      await this.assertTeacherAssignedToClass(actor.id, classId);
    }
    await this.assertAttendanceStudentsBelongToClass(
      classId,
      data.attendance.map((attendanceItem) => attendanceItem.studentId),
    );
    const teacherId = isTeacher
      ? actor.id
      : await this.resolveSingleTeacherForClass(classId);

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

    console.log(allowance);

    return this.createSession({
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
    });
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

      const studentTuitionFeeByStudentId = new Map<string, number | null>();
      if (
        shouldRebuildAttendanceState &&
        nextAttendanceStudentIds.length > 0
      ) {
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
      }

      const customerCareByStudentId = new Map<
        string,
        { profitPercent: number | null; staffId: string | null }
      >();
      if (
        data.attendance !== undefined &&
        nextAttendanceStudentIds.length > 0
      ) {
        const studentCustomerCare = await tx.customerCareService.findMany({
          where: {
            studentId: {
              in: nextAttendanceStudentIds,
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
              ? this.resolveAttendanceTuitionFee(
                attendanceItem.tuitionFee,
                defaultTuitionFee,
              )
              : nextClassId !== existingSession.classId
                ? this.normalizeAttendanceTuitionFee(defaultTuitionFee)
                : this.normalizeAttendanceTuitionFee(
                  existingAttendance?.tuitionFee ?? null,
                );

          return {
            studentId: attendanceItem.studentId,
            status: attendanceItem.status,
            notes: attendanceItem.notes ?? null,
            tuitionFee: resolvedTuitionFee,
            customerCareCoef:
              data.attendance !== undefined
                ? customerCareByStudentId.get(attendanceItem.studentId)
                  ?.profitPercent ?? null
                : existingAttendance?.customerCareCoef ?? null,
            customerCareStaffId:
              data.attendance !== undefined
                ? customerCareByStudentId.get(attendanceItem.studentId)
                  ?.staffId ?? null
                : existingAttendance?.customerCareStaffId ?? null,
            existingAttendanceId: existingAttendance?.id ?? null,
            existingTransactionId: existingAttendance?.transactionId ?? null,
            existingCustomerCarePaymentStatus:
              existingAttendance?.customerCarePaymentStatus ?? null,
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
          ...existingSession.attendance.map((attendanceItem) => attendanceItem.studentId),
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
      const getAttendanceChargeAmount = (
        attendanceItem:
          | (typeof existingSession.attendance)[number]
          | (typeof nextAttendanceState)[number]
          | undefined,
      ) => {
        if (!attendanceItem) {
          return 0;
        }

        if ('transaction' in attendanceItem) {
          return Math.max(
            0,
            attendanceItem.transaction?.amount ?? attendanceItem.tuitionFee ?? 0,
          );
        }

        return Math.max(0, attendanceItem.tuitionFee ?? 0);
      };
      const updateStudentBalances = async (
        balanceChanges: Array<{ studentId: string; change: number }>,
      ) => {
        if (balanceChanges.length === 0) {
          return;
        }

        const balanceRows = balanceChanges.map((balanceChange) =>
          Prisma.sql`(${balanceChange.studentId}:: text, ${balanceChange.change}:: integer)`,
        );

        await tx.$executeRaw(Prisma.sql`
          UPDATE student_info AS s
          SET account_balance = COALESCE(s.account_balance, 0) + balance_change.change
          FROM(
            VALUES ${Prisma.join(balanceRows)}
          ) AS balance_change(student_id, change)
          WHERE s.id = balance_change.student_id
        `);
      };

      const oldSessionDateLabel = existingSession.date.toISOString().slice(0, 10);
      const nextSessionDateLabel = (
        sessionDate ?? existingSession.date
      ).toISOString().slice(0, 10);

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

          const oldChargeAmount = getAttendanceChargeAmount(attendanceItem);
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
          const oldChargeAmount = getAttendanceChargeAmount(existingAttendance);
          const newChargeAmount = getAttendanceChargeAmount(attendanceItem);
          const balanceBefore = getCurrentStudentBalance(attendanceItem.studentId);

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

      const balanceChanges = Array.from(studentBalanceDeltaByStudentId.entries())
        .map(([studentId, change]) => ({
          studentId,
          change,
        }))
        .filter((balanceChange) => balanceChange.change !== 0);
      await updateStudentBalances(balanceChanges);

      if (refundHistoryItems.length > 0) {
        await tx.walletTransactionsHistory.createMany({
          data: refundHistoryItems.map((refundItem) => ({
            studentId: refundItem.studentId,
            type: WalletTransactionType.topup,
            amount: refundItem.amount,
            note: `Hoàn trả số dư lớp ${refundItem.className} buổi học ${refundItem.dateLabel}. | Số dư: ${this.formatVND(refundItem.balanceBefore)} + ${this.formatVND(refundItem.amount)} = ${this.formatVND(refundItem.balanceBefore + refundItem.amount)}`,
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
              note: `Đóng học phí lớp ${chargeItem.className} buổi học ${chargeItem.dateLabel}. | Số dư: ${this.formatVND(chargeItem.balanceBefore)} - ${this.formatVND(chargeItem.amount)} = ${this.formatVND(chargeItem.balanceBefore - chargeItem.amount)}`,
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
            const oldChargeAmount = getAttendanceChargeAmount(existingAttendance);
            const newChargeAmount = getAttendanceChargeAmount(attendanceItem);
            const transactionId =
              oldChargeAmount === newChargeAmount
                ? existingAttendance?.transactionId ?? null
                : nextChargeTransactionIdByStudentId.get(
                  attendanceItem.studentId,
                ) ?? null;

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
      attendance?: Array<{
        studentId: string;
        status: NonNullable<SessionUpdateDto['attendance']>[number]['status'];
        notes?: string | null;
      }>;
    },
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

    const actor = await this.getStaffOperationsActor(userId, roleType);
    if (actor.roles.includes(StaffRole.teacher)) {
      await this.assertTeacherAssignedToClass(actor.id, existingSession.classId);
    }

    let enrichedAttendance: SessionUpdateDto['attendance'] | undefined;
    if (data.attendance !== undefined) {
      const tuitionByStudentId = await this.assertAttendanceStudentsBelongToClass(
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
          existingAttendanceByStudentId.get(attendanceItem.studentId) ??
          tuitionByStudentId.get(attendanceItem.studentId) ??
          null,
      }));
    }

    return this.updateSession({
      id: sessionId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      notes: data.notes,
      attendance: enrichedAttendance,
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
            Prisma.sql`(${balanceChange.studentId}:: text, ${balanceChange.change}:: integer)`,
        );

        await tx.$executeRaw(Prisma.sql`
          UPDATE student_info AS s
          SET account_balance = COALESCE(s.account_balance, 0) + balance_change.change
          FROM(
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

  async getSessionsByClassIdForStaff(
    userId: string,
    roleType: UserRole,
    classId: string,
    month: string,
    year: string,
  ) {
    const actor = await this.getStaffOperationsActor(userId, roleType);
    if (actor.roles.includes(StaffRole.teacher)) {
      await this.assertTeacherAssignedToClass(actor.id, classId);
    }
    return this.getSessionsByClassId(classId, month, year);
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

  async getUnpaidSessionsByTeacherId(
    teacherId: string,
    days = 14,
  ): Promise<SessionUnpaidSummaryItem[]> {
    const safeDays = Number.isInteger(days) && days > 0 ? days : 14;

    return this.prisma.$queryRaw<SessionUnpaidSummaryItem[]>(Prisma.sql`
      SELECT
        tab.class_id AS "classId",
        classes.name AS "className",
        SUM(tab.teacher_allowance_total) AS "totalAllowance"
      FROM (
        SELECT
          attendance.session_id,
          sessions.class_id,
          sessions.allowance_amount,
          classes.scale_amount,
          LEAST(
            classes.max_allowance_per_session,
            sessions.coefficient * (
              sessions.allowance_amount * COUNT(
                CASE
                  WHEN attendance.status = 'present' OR attendance.status = 'excused' THEN 1
                END
              ) + classes.scale_amount
            )
          ) AS teacher_allowance_total
        FROM attendance
        JOIN sessions ON attendance.session_id = sessions.id
        JOIN classes ON classes.id = sessions.class_id
        WHERE sessions.teacher_id = ${teacherId}
          AND sessions.teacher_payment_status = 'unpaid'
          AND sessions.date >= CURRENT_DATE - make_interval(days => ${safeDays - 1})
          AND sessions.date < CURRENT_DATE + INTERVAL '1 day'
        GROUP BY
          sessions.class_id,
          attendance.session_id,
          sessions.allowance_amount,
          classes.scale_amount,
          classes.max_allowance_per_session,
          sessions.coefficient
      ) AS tab
      JOIN classes ON classes.id = tab.class_id
      GROUP BY tab.class_id, classes.name
    `);
  }
}
