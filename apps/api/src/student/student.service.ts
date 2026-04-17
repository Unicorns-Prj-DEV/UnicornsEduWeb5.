import {
  BadRequestException,
  ForbiddenException,
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
  UserRole,
  WalletTransactionType,
} from 'generated/enums';
import { Prisma } from '../../generated/client';
import {
  CreateStudentDto,
  StudentWalletHistoryQueryDto,
  StudentListQueryDto,
  UpdateMyStudentAccountBalanceDto,
  UpdateStudentAccountBalanceCreateDto,
  UpdateStudentBodyDto,
  UpdateStudentClassesDto,
  UpdateStudentDto,
} from 'src/dtos/student.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { getUserFullNameFromParts } from 'src/common/user-name.util';

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
          user: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
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

type StudentAccountBalanceChangeOptions = {
  allowNegativeBalance: boolean;
  topupNotePrefix: string;
  withdrawNotePrefix: string;
  auditDescription: string;
};

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

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toDateOrNull(
  value: string | Date | null | undefined,
): Date | null | undefined {
  if (value == null) return value;
  if (value instanceof Date) return value;

  const normalized = String(value).trim();
  if (!normalized) {
    return undefined;
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getPreferredUserFullName(user: {
  first_name: string | null;
  last_name: string | null;
  accountHandle: string;
  email: string;
}) {
  const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  if (fullName) {
    return fullName;
  }

  const handle = user.accountHandle?.trim();
  if (handle) {
    return handle;
  }

  return user.email;
}

type StudentAuditClient = Prisma.TransactionClient | PrismaService;

type StudentDetailAccess = {
  userId: string;
  roleType: UserRole;
};

@Injectable()
export class StudentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionHistoryService: ActionHistoryService,
  ) {}

  private formatVND(amount: number) {
    return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
  }

  private getUserEligibilityForStudentAssignment(user: {
    roleType: UserRole;
    studentInfo: { id: string } | null;
    staffInfo: { id: string } | null;
  }) {
    if (user.studentInfo) {
      return {
        isEligible: false,
        ineligibleReason: 'User này đã có hồ sơ học sinh.',
      };
    }

    if (user.staffInfo) {
      return {
        isEligible: false,
        ineligibleReason:
          'User này đang có hồ sơ nhân sự nên không thể gán làm học sinh.',
      };
    }

    if (user.roleType !== UserRole.guest && user.roleType !== UserRole.student) {
      return {
        isEligible: false,
        ineligibleReason:
          'Chỉ có thể gán học sinh cho user đang có role guest hoặc student.',
      };
    }

    return {
      isEligible: true,
      ineligibleReason: null,
    };
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

  private serializeStudentClass(
    studentClass: StudentWithClasses['studentClasses'][number],
  ) {
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
            normalizeNullableMoney(studentClass.class.studentTuitionPerSession) !=
              null
          ? 'class'
          : 'unset',
      totalAttendedSession: studentClass.totalAttendedSession,
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
              fullName:
                getUserFullNameFromParts(
                  student.customerCareServices.staff.user,
                ) ?? '',
              roles: student.customerCareServices.staff.roles,
              status: student.customerCareServices.staff.status,
            },
            profitPercent: normalizeNullableDecimal(
              student.customerCareServices.profitPercent,
            ),
          }
        : null,
      studentClasses: student.studentClasses.map((studentClass) =>
        this.serializeStudentClass(studentClass),
      ),
    };
  }

  private serializeStudentSelfDetail(student: StudentDetailEntity) {
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
      birthYear: student.birthYear,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      goal: student.goal,
      studentClasses: student.studentClasses.map((studentClass) =>
        this.serializeStudentClass(studentClass),
      ),
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

  private async assertCanAccessStudentDetail(
    studentId: string,
    access?: StudentDetailAccess,
  ) {
    if (!access) {
      return;
    }

    if (access.roleType === UserRole.admin) {
      return;
    }

    if (access.roleType !== UserRole.staff) {
      throw new ForbiddenException(
        'Only authorized roles can access this resource',
      );
    }

    const staff = await this.prisma.staffInfo.findUnique({
      where: { userId: access.userId },
      select: {
        id: true,
        roles: true,
      },
    });

    if (!staff) {
      throw new ForbiddenException(
        'Only authorized roles can access this resource',
      );
    }

    if (staff.roles.includes(StaffRole.assistant)) {
      return;
    }

    if (!staff.roles.includes(StaffRole.customer_care)) {
      throw new ForbiddenException(
        'Only authorized roles can access this resource',
      );
    }

    const customerCareAssignment = await this.prisma.customerCareService.findUnique({
      where: { studentId },
      select: {
        staffId: true,
      },
    });

    if (!customerCareAssignment || customerCareAssignment.staffId !== staff.id) {
      throw new NotFoundException('Student not found');
    }
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

  async searchAssignableUsersByEmail(email: string) {
    const trimmedEmail = email.trim();
    if (trimmedEmail.length < 2) {
      throw new BadRequestException('Email tìm kiếm phải có ít nhất 2 ký tự.');
    }

    const users = await this.prisma.user.findMany({
      where: {
        email: {
          contains: trimmedEmail,
          mode: 'insensitive',
        },
      },
      take: 8,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        accountHandle: true,
        province: true,
        roleType: true,
        status: true,
        first_name: true,
        last_name: true,
        studentInfo: {
          select: {
            id: true,
          },
        },
        staffInfo: {
          select: {
            id: true,
          },
        },
      },
    });

    return users
      .map((user) => {
        const eligibility = this.getUserEligibilityForStudentAssignment(user);

        return {
          id: user.id,
          email: user.email,
          accountHandle: user.accountHandle,
          province: user.province,
          roleType: user.roleType,
          status: user.status,
          fullName: getPreferredUserFullName(user),
          hasStudentProfile: Boolean(user.studentInfo),
          studentId: user.studentInfo?.id ?? null,
          hasStaffProfile: Boolean(user.staffInfo),
          staffId: user.staffInfo?.id ?? null,
          isEligible: eligibility.isEligible,
          ineligibleReason: eligibility.ineligibleReason,
        };
      })
      .sort((a, b) => {
        const aExact = a.email.toLowerCase() === trimmedEmail.toLowerCase();
        const bExact = b.email.toLowerCase() === trimmedEmail.toLowerCase();

        if (aExact === bExact) {
          return a.email.localeCompare(b.email);
        }

        return aExact ? -1 : 1;
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

  async getStudentById(id: string, access?: StudentDetailAccess) {
    await this.assertCanAccessStudentDetail(id, access);

    const student = await this.prisma.studentInfo.findUnique({
      where: { id },
      include: studentDetailInclude,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.serializeStudentDetail(student);
  }

  async getStudentSelfDetail(id: string) {
    const student = await this.prisma.studentInfo.findUnique({
      where: { id },
      include: studentDetailInclude,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.serializeStudentSelfDetail(student);
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

  async getStudentSelfWalletHistory(
    id: string,
    query: StudentWalletHistoryQueryDto,
  ) {
    return this.getStudentWalletHistory(id, query);
  }

  private async applyStudentAccountBalanceChange(
    studentId: string,
    amount: number,
    options: StudentAccountBalanceChangeOptions,
    auditActor?: ActionHistoryActor,
  ) {
    const normalizedAmount = Math.round(amount);

    if (!Number.isFinite(normalizedAmount) || normalizedAmount === 0) {
      throw new BadRequestException('Amount must be a non-zero number.');
    }

    const beforeValue = auditActor
      ? await this.getStudentAuditSnapshot(this.prisma, studentId)
      : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const student = await tx.studentInfo.findUnique({
        where: { id: studentId },
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

      if (!options.allowNegativeBalance && balanceAfter < 0) {
        throw new BadRequestException(
          'Insufficient balance for this withdrawal.',
        );
      }

      const transactionType =
        normalizedAmount > 0
          ? WalletTransactionType.topup
          : WalletTransactionType.loan;
      const transactionAmount = Math.abs(normalizedAmount);
      const notePrefix =
        normalizedAmount > 0
          ? options.topupNotePrefix
          : options.withdrawNotePrefix;
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
        where: { id: studentId },
        data: { accountBalance: { increment: normalizedAmount } },
        include: studentDetailInclude,
      });

      if (auditActor && beforeValue) {
        await this.actionHistoryService.recordUpdate(tx, {
          actor: auditActor,
          entityType: 'student',
          entityId: studentId,
          description: options.auditDescription,
          beforeValue,
          afterValue: this.serializeStudentDetail(nextStudent),
        });
      }

      return nextStudent;
    });

    return updated;
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
    const updated = await this.applyStudentAccountBalanceChange(
      data.student_id,
      data.amount,
      {
        allowNegativeBalance: true,
        topupNotePrefix: 'Nạp tiền thủ công từ trang chi tiết học sinh.',
        withdrawNotePrefix:
          'Điều chỉnh giảm số dư thủ công từ trang chi tiết học sinh.',
        auditDescription: 'Điều chỉnh số dư học sinh',
      },
      auditActor,
    );

    return this.serializeStudentDetail(updated);
  }

  async updateMyStudentAccountBalance(
    studentId: string,
    data: UpdateMyStudentAccountBalanceDto,
    auditActor?: ActionHistoryActor,
  ) {
    const updated = await this.applyStudentAccountBalanceChange(
      studentId,
      data.amount,
      {
        allowNegativeBalance: false,
        topupNotePrefix: 'Học sinh tự nạp tiền từ trang thông tin cá nhân.',
        withdrawNotePrefix: 'Học sinh tự rút tiền từ trang thông tin cá nhân.',
        auditDescription: 'Học sinh tự điều chỉnh số dư',
      },
      auditActor,
    );

    return this.serializeStudentSelfDetail(updated);
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

    const attendanceCount = await this.prisma.attendance.count({
      where: {
        studentId: id,
      },
    });
    if (attendanceCount > 0) {
      throw new BadRequestException(
        'Không thể xóa học sinh vì đã có điểm danh/buổi học liên kết. Vui lòng cân nhắc chuyển trạng thái hoặc lưu trữ thay vì xóa.',
      );
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
    const user = await this.prisma.user.findUnique({
      where: {
        id: data.user_id,
      },
      select: {
        id: true,
        email: true,
        province: true,
        roleType: true,
        studentInfo: {
          select: {
            id: true,
          },
        },
        staffInfo: {
          select: {
            id: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const eligibility = this.getUserEligibilityForStudentAssignment(user);
    if (!eligibility.isEligible) {
      throw new BadRequestException(eligibility.ineligibleReason);
    }

    const trimmedFullName = data.full_name.trim();
    if (!trimmedFullName) {
      throw new BadRequestException('Student full name is required.');
    }

    return this.prisma.$transaction(async (tx) => {
      const createdStudent = await tx.studentInfo.create({
        data: {
          fullName: trimmedFullName,
          email: normalizeOptionalText(data.email) ?? user.email,
          school: normalizeOptionalText(data.school),
          province:
            normalizeOptionalText(data.province) ??
            normalizeOptionalText(user.province),
          birthYear: data.birth_year,
          parentName: normalizeOptionalText(data.parent_name),
          parentPhone: normalizeOptionalText(data.parent_phone),
          status: data.status ?? StudentStatus.active,
          gender: data.gender ?? Gender.male,
          goal: normalizeOptionalText(data.goal),
          dropOutDate: toDateOrNull(data.drop_out_date) ?? undefined,
          userId: data.user_id,
        },
      });

      if (user.roleType !== UserRole.student) {
        await tx.user.update({
          where: {
            id: data.user_id,
          },
          data: {
            roleType: UserRole.student,
          },
        });
      }

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
