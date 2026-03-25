import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActionHistoryActor,
  ActionHistoryService,
} from '../action-history/action-history.service';
import {
  Gender,
  StaffRole,
  StudentStatus,
  WalletTransactionType,
} from 'generated/enums';
import { Prisma } from '../../generated/client';
import {
  CreateStudentDto,
  StudentWalletHistoryQueryDto,
  StudentListQueryDto,
  UpdateStudentAccountBalanceCreateDto,
  UpdateStudentBodyDto,
  UpdateStudentClassesDto,
  UpdateStudentDto,
} from 'src/dtos/student.dto';
import { PrismaService } from 'src/prisma/prisma.service';

const studentClassDetailInclude = {
  include: {
    class: {
      select: {
        id: true,
        name: true,
        status: true,
        tuitionPackageTotal: true,
        tuitionPackageSession: true,
        studentTuitionPerSession: true,
      },
    },
  },
} satisfies Prisma.StudentClassFindManyArgs;

const studentDetailInclude = {
  studentClasses: studentClassDetailInclude,
  customerCareServices: {
    include: {
      staff: {
        select: {
          id: true,
          fullName: true,
          roles: true,
          status: true,
        },
      },
    },
  },
} satisfies Prisma.StudentInfoInclude;

type StudentWithClasses = Prisma.StudentInfoGetPayload<{
  include: {
    studentClasses: typeof studentClassDetailInclude;
  };
}>;

type StudentDetailEntity = Prisma.StudentInfoGetPayload<{
  include: typeof studentDetailInclude;
}>;

type WalletTransactionHistoryEntity =
  Prisma.WalletTransactionsHistoryGetPayload<{
    select: {
      id: true;
      type: true;
      amount: true;
      note: true;
      date: true;
      createdAt: true;
    };
  }>;

function normalizeNullableMoney(
  value: number | null | undefined,
): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.floor(value);
}

function resolveDerivedTuitionPerSession(
  packageTotal: number | null | undefined,
  packageSession: number | null | undefined,
): number | null {
  if (
    typeof packageTotal !== 'number' ||
    !Number.isFinite(packageTotal) ||
    typeof packageSession !== 'number' ||
    !Number.isFinite(packageSession) ||
    packageSession <= 0
  ) {
    return null;
  }

  return Math.round(packageTotal / packageSession);
}

function resolveEffectiveTuitionPerSession(options: {
  customTuitionPerSession?: number | null;
  classTuitionPerSession?: number | null;
  effectivePackageTotal?: number | null;
  effectivePackageSession?: number | null;
}) {
  return (
    normalizeNullableMoney(options.customTuitionPerSession) ??
    normalizeNullableMoney(options.classTuitionPerSession) ??
    resolveDerivedTuitionPerSession(
      options.effectivePackageTotal,
      options.effectivePackageSession,
    )
  );
}

function hasCustomTuitionOverride(options: {
  customTuitionPerSession?: number | null;
  customTuitionPackageTotal?: number | null;
  customTuitionPackageSession?: number | null;
}) {
  return (
    normalizeNullableMoney(options.customTuitionPerSession) != null ||
    normalizeNullableMoney(options.customTuitionPackageTotal) != null ||
    normalizeNullableMoney(options.customTuitionPackageSession) != null
  );
}

function normalizeNullableDecimal(
  value: Prisma.Decimal | number | string | null | undefined,
): number | null {
  if (value == null) {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCustomerCareProfitPercent(
  value: number | null | undefined,
): Prisma.Decimal | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (!Number.isFinite(value)) {
    throw new BadRequestException(
      'Customer care profit percent must be a valid number.',
    );
  }

  const rounded = Math.round(value * 100) / 100;
  if (rounded < 0 || rounded > 0.99) {
    throw new BadRequestException(
      'Customer care profit percent must be between 0.00 and 0.99.',
    );
  }

  return new Prisma.Decimal(rounded.toFixed(2));
}

type StudentAuditClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class StudentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionHistoryService: ActionHistoryService,
  ) {}

  private formatVND(amount: number) {
    return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
  }

  private serializeStudentListItem(student: StudentWithClasses) {
    return {
      id: student.id,
      fullName: student.fullName,
      email: student.email,
      accountBalance: student.accountBalance,
      school: student.school,
      province: student.province,
      status: student.status,
      gender: student.gender,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      studentClasses: student.studentClasses.map((studentClass) => ({
        class: {
          id: studentClass.class.id,
          name: studentClass.class.name,
          status: studentClass.class.status,
        },
      })),
    };
  }

  private serializeStudentDetail(student: StudentDetailEntity) {
    return {
      ...this.serializeStudentListItem(student),
      birthYear: student.birthYear,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      goal: student.goal,
      dropOutDate: student.dropOutDate,
      customerCare: student.customerCareServices
        ? {
            staff: {
              id: student.customerCareServices.staff.id,
              fullName: student.customerCareServices.staff.fullName,
              roles: student.customerCareServices.staff.roles,
              status: student.customerCareServices.staff.status,
            },
            profitPercent: normalizeNullableDecimal(
              student.customerCareServices.profitPercent,
            ),
          }
        : null,
      studentClasses: student.studentClasses.map((studentClass) => {
        const customTuitionPerSession = normalizeNullableMoney(
          studentClass.customStudentTuitionPerSession,
        );
        const customTuitionPackageTotal = normalizeNullableMoney(
          studentClass.customTuitionPackageTotal,
        );
        const customTuitionPackageSession = normalizeNullableMoney(
          studentClass.customTuitionPackageSession,
        );
        const effectiveTuitionPackageTotal =
          customTuitionPackageTotal ??
          normalizeNullableMoney(studentClass.class.tuitionPackageTotal);
        const effectiveTuitionPackageSession =
          customTuitionPackageSession ??
          normalizeNullableMoney(studentClass.class.tuitionPackageSession);
        const effectiveTuitionPerSession = resolveEffectiveTuitionPerSession({
          customTuitionPerSession,
          classTuitionPerSession: studentClass.class.studentTuitionPerSession,
          effectivePackageTotal: effectiveTuitionPackageTotal,
          effectivePackageSession: effectiveTuitionPackageSession,
        });

        return {
          class: {
            id: studentClass.class.id,
            name: studentClass.class.name,
            status: studentClass.class.status,
          },
          customTuitionPerSession,
          customTuitionPackageTotal,
          customTuitionPackageSession,
          effectiveTuitionPerSession,
          effectiveTuitionPackageTotal,
          effectiveTuitionPackageSession,
          tuitionPackageSource: hasCustomTuitionOverride({
            customTuitionPerSession,
            customTuitionPackageTotal,
            customTuitionPackageSession,
          })
            ? 'custom'
            : effectiveTuitionPackageTotal != null ||
                effectiveTuitionPackageSession != null ||
                normalizeNullableMoney(
                  studentClass.class.studentTuitionPerSession,
                ) != null
              ? 'class'
              : 'unset',
          totalAttendedSession: studentClass.totalAttendedSession,
        };
      }),
    };
  }

  private serializeWalletTransaction(
    transaction: WalletTransactionHistoryEntity,
  ) {
    return {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      note: transaction.note,
      date: transaction.date,
      createdAt: transaction.createdAt,
    };
  }

  private async getStudentAuditSnapshot(
    db: StudentAuditClient,
    studentId: string,
  ) {
    const student = await db.studentInfo.findUnique({
      where: { id: studentId },
      include: studentDetailInclude,
    });

    return student ? this.serializeStudentDetail(student) : null;
  }

  private buildUpdateData(dto: UpdateStudentBodyDto) {
    const data: Record<string, unknown> = {};

    if (dto.full_name !== undefined) data.fullName = dto.full_name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.school !== undefined) data.school = dto.school;
    if (dto.province !== undefined) data.province = dto.province;
    if (dto.birth_year !== undefined) data.birthYear = dto.birth_year;
    if (dto.parent_name !== undefined) data.parentName = dto.parent_name;
    if (dto.parent_phone !== undefined) data.parentPhone = dto.parent_phone;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.goal !== undefined) data.goal = dto.goal;

    if (dto.drop_out_date !== undefined) {
      const date = new Date(dto.drop_out_date);
      data.dropOutDate = Number.isNaN(date.getTime()) ? undefined : date;
    }

    return data as Parameters<typeof this.prisma.studentInfo.update>[0]['data'];
  }

  private async syncCustomerCareAssignment(
    tx: Prisma.TransactionClient,
    studentId: string,
    dto: UpdateStudentBodyDto,
  ) {
    const shouldSyncCustomerCare =
      dto.customer_care_staff_id !== undefined ||
      dto.customer_care_profit_percent !== undefined;

    if (!shouldSyncCustomerCare) {
      return;
    }

    const existingAssignment = await tx.customerCareService.findUnique({
      where: { studentId },
      select: {
        staffId: true,
        profitPercent: true,
      },
    });

    const nextStaffId =
      dto.customer_care_staff_id !== undefined
        ? (dto.customer_care_staff_id ?? null)
        : (existingAssignment?.staffId ?? null);
    const nextProfitPercent =
      dto.customer_care_profit_percent !== undefined
        ? normalizeCustomerCareProfitPercent(
            dto.customer_care_profit_percent ?? null,
          )
        : (existingAssignment?.profitPercent ?? null);

    if (nextStaffId == null) {
      if (dto.customer_care_profit_percent != null) {
        throw new BadRequestException(
          'Cannot set customer care profit percent without a customer care staff.',
        );
      }

      if (existingAssignment) {
        await tx.customerCareService.delete({
          where: { studentId },
        });
      }

      return;
    }

    const customerCareStaff = await tx.staffInfo.findUnique({
      where: { id: nextStaffId },
      select: {
        id: true,
        roles: true,
      },
    });

    if (!customerCareStaff) {
      throw new NotFoundException('Customer care staff not found');
    }

    const isEligibleCustomerCareStaff = customerCareStaff.roles.some(
      (role) => role === StaffRole.customer_care,
    );
    if (!isEligibleCustomerCareStaff) {
      throw new BadRequestException(
        'Selected staff is not eligible for customer care assignment.',
      );
    }

    await tx.customerCareService.upsert({
      where: { studentId },
      create: {
        studentId,
        staffId: nextStaffId,
        profitPercent: nextProfitPercent,
      },
      update: {
        staffId: nextStaffId,
        profitPercent: nextProfitPercent,
      },
    });
  }

  async getStudents(query: StudentListQueryDto) {
    const parsedPage = Number(query.page);
    const parsedLimit = Number(query.limit);
    const page =
      Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit >= 1
        ? Math.min(parsedLimit, 100)
        : 20;

    const trimmedSearch = query.search?.trim();
    const trimmedSchool = query.school?.trim();
    const trimmedProvince = query.province?.trim();
    const trimmedClassName = query.className?.trim();
    const normalizedStatus = query.status?.trim();
    const normalizedGender = query.gender?.trim();

    const statusFilter: StudentStatus | undefined =
      normalizedStatus === StudentStatus.active
        ? StudentStatus.active
        : normalizedStatus === StudentStatus.inactive
          ? StudentStatus.inactive
          : undefined;

    const genderFilter: Gender | undefined =
      normalizedGender === Gender.male
        ? Gender.male
        : normalizedGender === Gender.female
          ? Gender.female
          : undefined;

    const where: Prisma.StudentInfoWhereInput = {
      ...(trimmedSearch
        ? {
            fullName: {
              contains: trimmedSearch,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(trimmedSchool
        ? {
            school: {
              contains: trimmedSchool,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(trimmedProvince
        ? {
            province: {
              contains: trimmedProvince,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(genderFilter ? { gender: genderFilter } : {}),
      ...(trimmedClassName
        ? {
            studentClasses: {
              some: {
                class: {
                  name: {
                    contains: trimmedClassName,
                    mode: 'insensitive' as const,
                  },
                },
              },
            },
          }
        : {}),
    };

    const total = await this.prisma.studentInfo.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    const data = await this.prisma.studentInfo.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { accountBalance: 'asc' },
        { status: 'asc' },
        { fullName: 'asc' },
      ],
      include: {
        studentClasses: studentClassDetailInclude,
      },
    });

    return {
      data: data.map((student) => this.serializeStudentListItem(student)),
      meta: {
        total,
        page: safePage,
        limit,
      },
    };
  }

  async getStudentById(id: string) {
    const student = await this.prisma.studentInfo.findUnique({
      where: { id },
      include: studentDetailInclude,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.serializeStudentDetail(student);
  }

  async getStudentWalletHistory(
    id: string,
    query: StudentWalletHistoryQueryDto,
  ) {
    const student = await this.prisma.studentInfo.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const limit =
      typeof query.limit === 'number' && Number.isInteger(query.limit)
        ? Math.min(Math.max(query.limit, 1), 200)
        : 50;

    const transactions = await this.prisma.walletTransactionsHistory.findMany({
      where: { studentId: id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      select: {
        id: true,
        type: true,
        amount: true,
        note: true,
        date: true,
        createdAt: true,
      },
    });

    return transactions.map((transaction) =>
      this.serializeWalletTransaction(transaction),
    );
  }

  async updateStudentById(
    id: string,
    dto: UpdateStudentBodyDto,
    auditActor?: ActionHistoryActor,
  ) {
    const student = await this.prisma.studentInfo.findUnique({
      where: { id },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const updateData = this.buildUpdateData(dto);
    const shouldSyncCustomerCare =
      dto.customer_care_staff_id !== undefined ||
      dto.customer_care_profit_percent !== undefined;

    if (Object.keys(updateData).length === 0 && !shouldSyncCustomerCare) {
      return this.getStudentById(id);
    }

    const beforeValue = auditActor
      ? await this.getStudentAuditSnapshot(this.prisma, id)
      : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (Object.keys(updateData).length > 0) {
        await tx.studentInfo.update({
          where: { id },
          data: updateData,
        });
      }

      await this.syncCustomerCareAssignment(tx, id, dto);

      const nextStudent = await tx.studentInfo.findUnique({
        where: { id },
        include: studentDetailInclude,
      });

      if (!nextStudent) {
        throw new NotFoundException('Student not found');
      }

      if (auditActor && beforeValue) {
        const afterValue = this.serializeStudentDetail(nextStudent);
        await this.actionHistoryService.recordUpdate(tx, {
          actor: auditActor,
          entityType: 'student',
          entityId: id,
          description: 'Cập nhật học sinh',
          beforeValue,
          afterValue,
        });
      }

      return nextStudent;
    });

    return this.serializeStudentDetail(updated);
  }

  async updateStudent(data: UpdateStudentDto, auditActor?: ActionHistoryActor) {
    return this.updateStudentById(data.id, data, auditActor);
  }

  async updateStudentAccountBalance(
    data: UpdateStudentAccountBalanceCreateDto,
    auditActor?: ActionHistoryActor,
  ) {
    const normalizedAmount = Math.round(data.amount);

    if (!Number.isFinite(normalizedAmount) || normalizedAmount === 0) {
      throw new BadRequestException('Amount must be a non-zero number.');
    }

    const beforeValue = auditActor
      ? await this.getStudentAuditSnapshot(this.prisma, data.student_id)
      : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const student = await tx.studentInfo.findUnique({
        where: { id: data.student_id },
        select: {
          id: true,
          accountBalance: true,
        },
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      const balanceBefore = student.accountBalance ?? 0;
      const balanceAfter = balanceBefore + normalizedAmount;
      const transactionType =
        normalizedAmount > 0
          ? WalletTransactionType.topup
          : WalletTransactionType.loan;
      const transactionAmount = Math.abs(normalizedAmount);
      const notePrefix =
        normalizedAmount > 0
          ? 'Nạp tiền thủ công từ trang chi tiết học sinh.'
          : 'Điều chỉnh giảm số dư thủ công từ trang chi tiết học sinh.';
      const operator = normalizedAmount > 0 ? '+' : '-';

      await tx.walletTransactionsHistory.create({
        data: {
          studentId: student.id,
          type: transactionType,
          amount: transactionAmount,
          note: `${notePrefix} | Số dư: ${this.formatVND(balanceBefore)} ${operator} ${this.formatVND(transactionAmount)} = ${this.formatVND(balanceAfter)}`,
          date: new Date(),
        },
      });

      const nextStudent = await tx.studentInfo.update({
        where: { id: data.student_id },
        data: { accountBalance: { increment: normalizedAmount } },
        include: studentDetailInclude,
      });

      if (auditActor && beforeValue) {
        await this.actionHistoryService.recordUpdate(tx, {
          actor: auditActor,
          entityType: 'student',
          entityId: data.student_id,
          description: 'Điều chỉnh số dư học sinh',
          beforeValue,
          afterValue: this.serializeStudentDetail(nextStudent),
        });
      }

      return nextStudent;
    });

    return this.serializeStudentDetail(updated);
  }

  async updateStudentClasses(
    id: string,
    dto: UpdateStudentClassesDto,
    auditActor?: ActionHistoryActor,
  ) {
    const student = await this.prisma.studentInfo.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const classIds = Array.from(new Set(dto.class_ids));
    if (classIds.length > 0) {
      const classes = await this.prisma.class.findMany({
        where: {
          id: {
            in: classIds,
          },
        },
        select: { id: true },
      });

      if (classes.length !== classIds.length) {
        throw new NotFoundException('One or more classes not found');
      }
    }

    const existingMemberships = await this.prisma.studentClass.findMany({
      where: { studentId: id },
      select: { classId: true },
    });
    const existingClassIds = new Set(
      existingMemberships.map((membership) => membership.classId),
    );
    const classIdsToRemove = existingMemberships
      .map((membership) => membership.classId)
      .filter((classId) => !classIds.includes(classId));
    const classIdsToAdd = classIds.filter(
      (classId) => !existingClassIds.has(classId),
    );

    const beforeValue = auditActor
      ? await this.getStudentAuditSnapshot(this.prisma, id)
      : null;

    const updatedStudent = await this.prisma.$transaction(async (tx) => {
      if (classIdsToRemove.length > 0) {
        await tx.studentClass.deleteMany({
          where: {
            studentId: id,
            classId: {
              in: classIdsToRemove,
            },
          },
        });
      }

      if (classIds.length === 0) {
        const nextStudent = await tx.studentInfo.findUnique({
          where: { id },
          include: studentDetailInclude,
        });

        if (!nextStudent) {
          throw new NotFoundException('Student not found');
        }

        if (auditActor && beforeValue) {
          await this.actionHistoryService.recordUpdate(tx, {
            actor: auditActor,
            entityType: 'student',
            entityId: id,
            description: 'Cập nhật danh sách lớp của học sinh',
            beforeValue,
            afterValue: this.serializeStudentDetail(nextStudent),
          });
        }

        return nextStudent;
      }

      if (classIdsToAdd.length > 0) {
        await tx.studentClass.createMany({
          data: classIdsToAdd.map((classId) => ({
            classId,
            studentId: id,
          })),
        });
      }

      const nextStudent = await tx.studentInfo.findUnique({
        where: { id },
        include: studentDetailInclude,
      });

      if (!nextStudent) {
        throw new NotFoundException('Student not found');
      }

      if (auditActor && beforeValue) {
        await this.actionHistoryService.recordUpdate(tx, {
          actor: auditActor,
          entityType: 'student',
          entityId: id,
          description: 'Cập nhật danh sách lớp của học sinh',
          beforeValue,
          afterValue: this.serializeStudentDetail(nextStudent),
        });
      }

      return nextStudent;
    });

    return this.serializeStudentDetail(updatedStudent);
  }

  async deleteStudent(id: string, auditActor?: ActionHistoryActor) {
    const beforeValue = await this.getStudentAuditSnapshot(this.prisma, id);

    if (!beforeValue) {
      throw new NotFoundException('Student not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const deletedStudent = await tx.studentInfo.delete({
        where: {
          id,
        },
      });

      if (auditActor) {
        await this.actionHistoryService.recordDelete(tx, {
          actor: auditActor,
          entityType: 'student',
          entityId: id,
          description: 'Xóa học sinh',
          beforeValue,
        });
      }

      return deletedStudent;
    });
  }

  async createStudent(data: CreateStudentDto, auditActor?: ActionHistoryActor) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: {
          id: data.user_id,
        },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const createdStudent = await tx.studentInfo.create({
        data: {
          fullName: data.full_name,
          email: data.email,
          school: data.school,
          province: data.province,
          birthYear: data.birth_year,
          parentName: data.parent_name,
          parentPhone: data.parent_phone,
          status: data.status,
          gender: data.gender,
          goal: data.goal,
          userId: data.user_id,
        },
      });

      if (auditActor) {
        const afterValue = await this.getStudentAuditSnapshot(
          tx,
          createdStudent.id,
        );
        if (afterValue) {
          await this.actionHistoryService.recordCreate(tx, {
            actor: auditActor,
            entityType: 'student',
            entityId: createdStudent.id,
            description: 'Tạo học sinh',
            afterValue,
          });
        }
      }

      return createdStudent;
    });
  }
}
