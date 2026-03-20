import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/client';
import {
  ActionHistoryActor,
  ActionHistoryService,
} from '../action-history/action-history.service';
import { StaffRole, StaffStatus, UserRole } from 'generated/enums';
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import {
  CreateStaffDto,
  SearchCustomerCareStaffDto,
  type StaffIncomeAmountSummaryDto,
  type StaffIncomeClassSummaryDto,
  type StaffIncomeDepositClassSummaryDto,
  type StaffIncomeRoleSummaryDto,
  type StaffIncomeSummaryDto,
  UpdateStaffDto,
} from 'src/dtos/staff.dto';
import { PrismaService } from 'src/prisma/prisma.service';

/** Prisma expects DateTime; normalize date-only string (YYYY-MM-DD) to Date. */
function toDateOrNull(
  value: string | Date | null | undefined,
): Date | null | undefined {
  if (value == null) return value;
  if (value instanceof Date) return value;
  const str = String(value).trim();
  if (!str) return undefined;
  const date = new Date(str);
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

const STAFF_ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  teacher: 'Giáo viên',
  assistant: 'Trợ lí',
  lesson_plan: 'Giáo án',
  lesson_plan_head: 'Trưởng giáo án',
  accountant: 'Kế toán',
  communication: 'Truyền thông',
  customer_care: 'CSKH',
};

const DEPOSIT_PAYMENT_STATUSES = ['deposit', 'deposite', 'coc', 'cọc'] as const;

function normalizeMoneyAmount(value: number | string | null | undefined) {
  const amount = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function makeAmountSummary(): StaffIncomeAmountSummaryDto {
  return {
    total: 0,
    paid: 0,
    unpaid: 0,
  };
}

function buildMonthRange(month: string, year: string) {
  if (!/^\d{4}$/.test(year)) {
    throw new BadRequestException('year must use YYYY format.');
  }

  if (!/^(0[1-9]|1[0-2])$/.test(month)) {
    throw new BadRequestException('month must use 01-12 format.');
  }

  const parsedYear = Number(year);
  const parsedMonthIndex = Number(month) - 1;
  const start = new Date(parsedYear, parsedMonthIndex, 1);
  const end = new Date(parsedYear, parsedMonthIndex + 1, 1);

  return {
    monthKey: `${year}-${month}`,
    start,
    end,
    yearStart: new Date(parsedYear, 0, 1),
    yearEnd: new Date(parsedYear + 1, 0, 1),
  };
}

function buildRecentWindow(days?: number) {
  const safeDays =
    Number.isInteger(days) && (days as number) > 0 ? (days as number) : 14;
  const end = new Date();
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(start.getDate() - safeDays);

  return {
    days: safeDays,
    start,
    end,
  };
}

type TeacherAllowanceByClassStatusRow = {
  classId: string;
  className: string;
  teacherPaymentStatus: string | null;
  totalAllowance: number | string | null;
};

type TeacherAllowanceByClassRow = {
  classId: string;
  className: string;
  totalAllowance: number | string | null;
};

type TeacherAllowanceTotalRow = {
  totalAllowance: number | string | null;
};

type DepositSessionRow = {
  id: string;
  classId: string;
  className: string | null;
  date: Date | string;
  teacherPaymentStatus: string | null;
  teacherAllowanceTotal: number | string | null;
};

type StaffAuditClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionHistoryService: ActionHistoryService,
  ) {}

  private getStaffAuditSnapshot(db: StaffAuditClient, staffId: string) {
    return db.staffInfo.findUnique({
      where: { id: staffId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            first_name: true,
            last_name: true,
            accountHandle: true,
            province: true,
            roleType: true,
            status: true,
            emailVerified: true,
            phoneVerified: true,
            linkId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        classTeachers: {
          select: {
            customAllowance: true,
            class: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  async searchCustomerCareStaff(query: SearchCustomerCareStaffDto) {
    const limit =
      Number.isInteger(query.limit) && (query.limit as number) >= 1
        ? Math.min(query.limit as number, 50)
        : 20;
    const trimmedSearch = query.search?.trim();

    return this.prisma.staffInfo.findMany({
      where: {
        roles: {
          hasSome: [StaffRole.customer_care],
        },
        ...(trimmedSearch
          ? {
              fullName: {
                contains: trimmedSearch,
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        status: true,
        roles: true,
      },
      orderBy: [{ status: 'asc' }, { fullName: 'asc' }],
      take: limit,
    });
  }

  private getUserEligibilityForStaffAssignment(user: {
    roleType: UserRole;
    staffInfo: { id: string } | null;
  }) {
    if (user.staffInfo) {
      return {
        isEligible: false,
        ineligibleReason: 'User này đã có hồ sơ nhân sự.',
      };
    }

    if (user.roleType !== UserRole.guest && user.roleType !== UserRole.staff) {
      return {
        isEligible: false,
        ineligibleReason:
          'Chỉ có thể gán gia sư cho user đang có role guest hoặc staff.',
      };
    }

    return {
      isEligible: true,
      ineligibleReason: null,
    };
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
        staffInfo: {
          select: {
            id: true,
          },
        },
      },
    });

    return users
      .map((user) => {
        const eligibility = this.getUserEligibilityForStaffAssignment(user);

        return {
          id: user.id,
          email: user.email,
          accountHandle: user.accountHandle,
          province: user.province,
          roleType: user.roleType,
          status: user.status,
          fullName: getPreferredUserFullName(user),
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

  async getStaff(
    query: PaginationQueryDto & {
      search?: string;
      status?: string;
      classId?: string;
      className?: string;
      province?: string;
      university?: string;
      highSchool?: string;
      role?: string;
    },
  ) {
    const parsedPage = Number(query.page);
    const parsedLimit = Number(query.limit);
    const page =
      Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit >= 1
        ? Math.min(parsedLimit, 100)
        : 20;
    const trimmedSearch = query.search?.trim();
    const normalizedStatus = query.status?.trim();
    const trimmedClassId = query.classId?.trim();
    const trimmedClassName = query.className?.trim();
    const trimmedProvince = query.province?.trim();
    const trimmedUniversity = query.university?.trim();
    const trimmedHighSchool = query.highSchool?.trim();
    const trimmedRole = query.role?.trim();
    const statusFilter: StaffStatus | undefined =
      normalizedStatus === 'active'
        ? StaffStatus.active
        : normalizedStatus === 'inactive'
          ? StaffStatus.inactive
          : undefined;
    const roleFilter: StaffRole | undefined = Object.values(StaffRole).includes(
      trimmedRole as StaffRole,
    )
      ? (trimmedRole as StaffRole)
      : undefined;

    const where: Prisma.StaffInfoWhereInput = {
      ...(trimmedSearch
        ? {
            fullName: {
              contains: trimmedSearch,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(trimmedUniversity
        ? {
            university: {
              contains: trimmedUniversity,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(trimmedHighSchool
        ? {
            highSchool: {
              contains: trimmedHighSchool,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(roleFilter
        ? {
            roles: {
              has: roleFilter,
            },
          }
        : {}),
      ...(trimmedClassId
        ? {
            classTeachers: {
              some: {
                classId: trimmedClassId,
              },
            },
          }
        : {}),
      ...(trimmedClassName
        ? {
            classTeachers: {
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
      ...(trimmedProvince
        ? {
            user: {
              province: {
                contains: trimmedProvince,
                mode: 'insensitive' as const,
              },
            },
          }
        : {}),
    };

    const total = await this.prisma.staffInfo.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    const data = await this.prisma.staffInfo.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        {
          status: 'asc',
        },
        {
          fullName: 'asc',
        },
      ],
      include: {
        user: { select: { province: true } },
        classTeachers: {
          include: { class: { select: { id: true, name: true } } },
        },
        monthlyStats: {
          orderBy: { month: 'desc' },
          take: 1,
          select: { totalUnpaidAll: true },
        },
      },
    });

    return {
      data,
      meta: {
        total,
        page: safePage,
        limit,
      },
    };
  }

  private buildTeacherSessionAllowanceCte(params: {
    teacherId: string;
    start: Date;
    end: Date;
    teacherPaymentStatuses?: string[];
  }) {
    const whereClauses: Prisma.Sql[] = [
      Prisma.sql`sessions.teacher_id = ${params.teacherId}`,
      Prisma.sql`sessions.date >= ${params.start}`,
      Prisma.sql`sessions.date < ${params.end}`,
    ];

    const normalizedPaymentStatuses = (params.teacherPaymentStatuses ?? [])
      .map((status) => status.trim().toLowerCase())
      .filter((status) => status.length > 0);

    if (normalizedPaymentStatuses.length > 0) {
      whereClauses.push(
        Prisma.sql`LOWER(COALESCE(sessions.teacher_payment_status, '')) IN (${Prisma.join(normalizedPaymentStatuses)})`,
      );
    }

    return Prisma.sql`
      WITH session_attendance_allowances AS (
        SELECT
          sessions.id AS session_id,
          sessions.class_id,
          sessions.date AS session_date,
          sessions.teacher_payment_status,
          classes.name AS class_name,
          COALESCE(sessions.allowance_amount, 0) AS allowance_per_student,
          COALESCE(classes.scale_amount, 0) AS scale_amount,
          classes.max_allowance_per_session,
          COALESCE(sessions.coefficient, 1) AS coefficient,
          COUNT(*) FILTER (
            WHERE attendance.status = 'present'
          ) AS attended_student_count
        FROM attendance
        JOIN sessions ON attendance.session_id = sessions.id
        JOIN classes ON classes.id = sessions.class_id
        WHERE ${Prisma.join(whereClauses, ' AND ')}
        GROUP BY
          sessions.id,
          sessions.class_id,
          sessions.date,
          sessions.teacher_payment_status,
          classes.name,
          sessions.allowance_amount,
          classes.scale_amount,
          classes.max_allowance_per_session,
          sessions.coefficient
      ),
      teacher_session_allowances AS (
        SELECT
          session_id,
          class_id,
          session_date,
          teacher_payment_status,
          class_name,
          LEAST(
            COALESCE(
              max_allowance_per_session,
              ((allowance_per_student * attended_student_count) + scale_amount) *
                coefficient
            ),
            ((allowance_per_student * attended_student_count) + scale_amount) *
              coefficient
          ) AS teacher_allowance_total
        FROM session_attendance_allowances
      )
    `;
  }

  private async getTeacherAllowanceRowsByClassAndStatus(params: {
    teacherId: string;
    start: Date;
    end: Date;
    teacherPaymentStatuses?: string[];
  }): Promise<TeacherAllowanceByClassStatusRow[]> {
    return this.prisma.$queryRaw<TeacherAllowanceByClassStatusRow[]>(Prisma.sql`
      ${this.buildTeacherSessionAllowanceCte(params)}
      SELECT
        class_id AS "classId",
        class_name AS "className",
        teacher_payment_status AS "teacherPaymentStatus",
        COALESCE(SUM(teacher_allowance_total), 0) AS "totalAllowance"
      FROM teacher_session_allowances
      GROUP BY class_id, class_name, teacher_payment_status
    `);
  }

  private async getTeacherAllowanceRowsByClass(params: {
    teacherId: string;
    start: Date;
    end: Date;
    teacherPaymentStatuses?: string[];
  }): Promise<TeacherAllowanceByClassRow[]> {
    return this.prisma.$queryRaw<TeacherAllowanceByClassRow[]>(Prisma.sql`
      ${this.buildTeacherSessionAllowanceCte(params)}
      SELECT
        class_id AS "classId",
        class_name AS "className",
        COALESCE(SUM(teacher_allowance_total), 0) AS "totalAllowance"
      FROM teacher_session_allowances
      GROUP BY class_id, class_name
    `);
  }

  private async getTeacherAllowanceTotal(params: {
    teacherId: string;
    start: Date;
    end: Date;
    teacherPaymentStatuses?: string[];
  }) {
    const [row] = await this.prisma.$queryRaw<TeacherAllowanceTotalRow[]>(
      Prisma.sql`
        ${this.buildTeacherSessionAllowanceCte(params)}
        SELECT
          COALESCE(SUM(teacher_allowance_total), 0) AS "totalAllowance"
        FROM teacher_session_allowances
      `,
    );

    return normalizeMoneyAmount(row?.totalAllowance);
  }

  private async getDepositSessionRows(params: {
    teacherId: string;
    start: Date;
    end: Date;
  }): Promise<DepositSessionRow[]> {
    return this.prisma.$queryRaw<DepositSessionRow[]>(Prisma.sql`
      ${this.buildTeacherSessionAllowanceCte({
        teacherId: params.teacherId,
        start: params.start,
        end: params.end,
        teacherPaymentStatuses: [...DEPOSIT_PAYMENT_STATUSES],
      })}
      SELECT
        session_id AS id,
        class_id AS "classId",
        class_name AS "className",
        session_date AS date,
        teacher_payment_status AS "teacherPaymentStatus",
        COALESCE(teacher_allowance_total, 0) AS "teacherAllowanceTotal"
      FROM teacher_session_allowances
      ORDER BY class_name ASC, session_date DESC, session_id ASC
    `);
  }

  async getIncomeSummary(
    id: string,
    query: {
      month: string;
      year: string;
      days?: number;
    },
  ): Promise<StaffIncomeSummaryDto> {
    const range = buildMonthRange(query.month, query.year);
    const recentWindow = buildRecentWindow(query.days);

    const staff = await this.prisma.staffInfo.findUnique({
      where: { id },
      select: {
        id: true,
        roles: true,
        classTeachers: {
          select: {
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    const [
      monthlySessionRows,
      sessionYearTotal,
      depositSessionRows,
      recentUnpaidSessionRows,
      monthlyBonuses,
      recentUnpaidBonuses,
    ] = await Promise.all([
      this.getTeacherAllowanceRowsByClassAndStatus({
        teacherId: id,
        start: range.start,
        end: range.end,
      }),
      this.getTeacherAllowanceTotal({
        teacherId: id,
        start: range.yearStart,
        end: range.yearEnd,
      }),
      this.getDepositSessionRows({
        teacherId: id,
        start: range.yearStart,
        end: range.yearEnd,
      }),
      this.getTeacherAllowanceRowsByClass({
        teacherId: id,
        start: recentWindow.start,
        end: recentWindow.end,
        teacherPaymentStatuses: ['unpaid'],
      }),
      this.prisma.bonus.findMany({
        where: {
          staffId: id,
          month: range.monthKey,
        },
        select: {
          workType: true,
          amount: true,
          status: true,
        },
      }),
      this.prisma.bonus.findMany({
        where: {
          staffId: id,
          createdAt: {
            gte: recentWindow.start,
            lt: recentWindow.end,
          },
          NOT: {
            status: 'paid',
          },
        },
        select: {
          workType: true,
          amount: true,
        },
      }),
    ]);

    const sessionMonthlyTotals =
      monthlySessionRows.reduce<StaffIncomeAmountSummaryDto>((summary, row) => {
        const amount = normalizeMoneyAmount(row.totalAllowance);
        const isPaid =
          String(row.teacherPaymentStatus ?? '').toLowerCase() === 'paid';

        return {
          total: summary.total + amount,
          paid: summary.paid + (isPaid ? amount : 0),
          unpaid: summary.unpaid + (isPaid ? 0 : amount),
        };
      }, makeAmountSummary());

    const classSummaryById = new Map<string, StaffIncomeClassSummaryDto>();
    staff.classTeachers.forEach((assignment) => {
      classSummaryById.set(assignment.class.id, {
        classId: assignment.class.id,
        className: assignment.class.name,
        ...makeAmountSummary(),
      });
    });

    monthlySessionRows.forEach((row) => {
      const classId = row.classId?.trim();
      if (!classId) return;

      const current = classSummaryById.get(classId) ?? {
        classId,
        className: row.className?.trim() || 'Lớp chưa đặt tên',
        ...makeAmountSummary(),
      };
      const amount = normalizeMoneyAmount(row.totalAllowance);
      const isPaid =
        String(row.teacherPaymentStatus ?? '').toLowerCase() === 'paid';

      classSummaryById.set(classId, {
        ...current,
        total: current.total + amount,
        paid: current.paid + (isPaid ? amount : 0),
      });
    });

    recentUnpaidSessionRows.forEach((row) => {
      const classId = row.classId?.trim();
      if (!classId) return;

      const current = classSummaryById.get(classId) ?? {
        classId,
        className: row.className?.trim() || 'Lớp chưa đặt tên',
        ...makeAmountSummary(),
      };

      classSummaryById.set(classId, {
        ...current,
        unpaid: current.unpaid + normalizeMoneyAmount(row.totalAllowance),
      });
    });

    const bonusMonthlyTotals =
      monthlyBonuses.reduce<StaffIncomeAmountSummaryDto>((summary, bonus) => {
        const amount = normalizeMoneyAmount(bonus.amount);
        const isPaid = String(bonus.status ?? '').toLowerCase() === 'paid';

        return {
          total: summary.total + amount,
          paid: summary.paid + (isPaid ? amount : 0),
          unpaid: summary.unpaid,
        };
      }, makeAmountSummary());

    bonusMonthlyTotals.unpaid = recentUnpaidBonuses.reduce(
      (sum, bonus) => sum + normalizeMoneyAmount(bonus.amount),
      0,
    );

    const monthlyIncomeTotals: StaffIncomeAmountSummaryDto = {
      total: sessionMonthlyTotals.total + bonusMonthlyTotals.total,
      paid: sessionMonthlyTotals.paid + bonusMonthlyTotals.paid,
      unpaid: sessionMonthlyTotals.unpaid + bonusMonthlyTotals.unpaid,
    };

    const otherRoleSummaries: StaffIncomeRoleSummaryDto[] = staff.roles
      .filter((role) => role !== StaffRole.teacher)
      .map((role) => {
        const label = STAFF_ROLE_LABELS[role] ?? role;
        const monthlySummary = monthlyBonuses.reduce((summary, bonus) => {
          if ((bonus.workType?.trim() || '') !== label) {
            return summary;
          }

          const amount = normalizeMoneyAmount(bonus.amount);
          const isPaid = String(bonus.status ?? '').toLowerCase() === 'paid';

          return {
            total: summary.total + amount,
            paid: summary.paid + (isPaid ? amount : 0),
            unpaid: summary.unpaid,
          };
        }, makeAmountSummary());

        monthlySummary.unpaid = recentUnpaidBonuses.reduce((sum, bonus) => {
          if ((bonus.workType?.trim() || '') !== label) {
            return sum;
          }

          return sum + normalizeMoneyAmount(bonus.amount);
        }, 0);

        return {
          role,
          label,
          ...monthlySummary,
        };
      });

    const depositByClass = new Map<string, StaffIncomeDepositClassSummaryDto>();
    depositSessionRows.forEach((row) => {
      const classId = row.classId?.trim();
      if (!classId) return;

      const amount = normalizeMoneyAmount(row.teacherAllowanceTotal);
      const current = depositByClass.get(classId) ?? {
        classId,
        className: row.className?.trim() || 'Lớp chưa đặt tên',
        total: 0,
        sessions: [],
      };

      current.total += amount;
      current.sessions.push({
        id: row.id,
        date:
          row.date instanceof Date ? row.date.toISOString() : String(row.date),
        teacherPaymentStatus: row.teacherPaymentStatus,
        teacherAllowanceTotal: amount,
      });

      depositByClass.set(classId, current);
    });

    const depositYearByClass = Array.from(depositByClass.values()).sort(
      (a, b) => a.className.localeCompare(b.className, 'vi'),
    );
    const depositYearTotal = depositYearByClass.reduce(
      (sum, item) => sum + item.total,
      0,
    );

    return {
      recentUnpaidDays: recentWindow.days,
      monthlyIncomeTotals,
      sessionMonthlyTotals,
      sessionYearTotal,
      depositYearTotal,
      depositYearByClass,
      classMonthlySummaries: Array.from(classSummaryById.values()).sort(
        (a, b) => a.className.localeCompare(b.className, 'vi'),
      ),
      bonusMonthlyTotals,
      otherRoleSummaries,
    };
  }

  async getStaffById(id: string) {
    const tx = await this.prisma.$transaction(async (tx) => {
      const staff = await tx.staffInfo.findUnique({
        where: {
          id,
        },
        include: {
          user: { select: { province: true } },
          classTeachers: {
            include: { class: { select: { id: true, name: true } } },
          },
          monthlyStats: {
            orderBy: { month: 'desc' },
            take: 1,
            select: { totalUnpaidAll: true },
          },
        },
      });

      if (!staff) {
        throw new NotFoundException('Staff not found');
      }

      const classAllowance = await tx.$queryRaw`
      SELECT class_id, teacher_payment_status, SUM(teacher_allowance_total) as total_allowance, classes.name
      from
        (SELECT
          attendance.session_id,
          sessions.class_id,
          COALESCE(sessions.allowance_amount, 0) AS allowance_amount,
          COALESCE(classes.scale_amount, 0) AS scale_amount,
          sessions.teacher_payment_status,
          COUNT(*) FILTER (WHERE attendance.status = 'present') as student_count,
          LEAST(
            COALESCE(
              classes.max_allowance_per_session,
              (
                COALESCE(sessions.coefficient, 1) * (
                  COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (WHERE attendance.status = 'present') + COALESCE(classes.scale_amount, 0)
                )
              )
            ),
            (
              COALESCE(sessions.coefficient, 1) * (
                COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (WHERE attendance.status = 'present') + COALESCE(classes.scale_amount, 0)
              )
            )
          ) AS teacher_allowance_total
        from attendance
        join sessions on attendance.session_id = sessions.id
        join classes on classes.id = sessions.class_id
        where sessions.teacher_id=${id}
        group by sessions.class_id, attendance.session_id, sessions.allowance_amount, classes.scale_amount, sessions.teacher_payment_status, classes.max_allowance_per_session, sessions.coefficient) as tab
      join classes on classes.id = class_id
      group by tab.class_id, teacher_payment_status , classes.name
      `;

      return {
        ...staff,
        classAllowance,
      };
    });

    return tx;
  }

  async updateStaff(data: UpdateStaffDto, auditActor?: ActionHistoryActor) {
    const existingStaff = await this.getStaffAuditSnapshot(this.prisma, data.id);

    if (!existingStaff) {
      throw new NotFoundException('Staff not found');
    }

    const payload: Record<string, unknown> = {};
    if (data.full_name != null) payload.fullName = data.full_name;
    const birthDateNorm = toDateOrNull(data.birth_date);
    if (birthDateNorm !== undefined) payload.birthDate = birthDateNorm;
    if (data.university != null) payload.university = data.university;
    if (data.high_school != null) payload.highSchool = data.high_school;
    if (data.specialization != null)
      payload.specialization = data.specialization;
    if (data.bank_account != null) payload.bankAccount = data.bank_account;
    if (data.bank_qr_link != null) payload.bankQrLink = data.bank_qr_link;
    if (data.roles != null) payload.roles = data.roles;
    if (data.user_id != null) payload.userId = data.user_id;
    if (data.status != null) payload.status = data.status;

    return this.prisma.$transaction(async (tx) => {
      const updatedStaff = await tx.staffInfo.update({
        where: { id: data.id },
        data: payload as Parameters<
          typeof this.prisma.staffInfo.update
        >[0]['data'],
      });

      if (auditActor) {
        const afterValue = await this.getStaffAuditSnapshot(tx, data.id);
        if (afterValue) {
          await this.actionHistoryService.recordUpdate(tx, {
            actor: auditActor,
            entityType: 'staff',
            entityId: data.id,
            description: 'Cập nhật nhân sự',
            beforeValue: existingStaff,
            afterValue,
          });
        }
      }

      return updatedStaff;
    });
  }

  async deleteStaff(id: string, auditActor?: ActionHistoryActor) {
    const existingStaff = await this.getStaffAuditSnapshot(this.prisma, id);

    if (!existingStaff) {
      throw new NotFoundException('Staff not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const deletedStaff = await tx.staffInfo.delete({
        where: {
          id,
        },
      });

      if (auditActor) {
        await this.actionHistoryService.recordDelete(tx, {
          actor: auditActor,
          entityType: 'staff',
          entityId: id,
          description: 'Xóa nhân sự',
          beforeValue: existingStaff,
        });
      }

      return deletedStaff;
    });
  }
  async createStaff(data: CreateStaffDto, auditActor?: ActionHistoryActor) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: data.user_id,
      },
      select: {
        id: true,
        roleType: true,
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

    const eligibility = this.getUserEligibilityForStaffAssignment(user);
    if (!eligibility.isEligible) {
      throw new BadRequestException(eligibility.ineligibleReason);
    }

    return await this.prisma.$transaction(async (tx) => {
      const createdStaff = await tx.staffInfo.create({
        data: {
          fullName: data.full_name,
          birthDate: toDateOrNull(data.birth_date) ?? undefined,
          university: data.university,
          highSchool: data.high_school,
          specialization: data.specialization,
          bankAccount: data.bank_account,
          bankQrLink: data.bank_qr_link,
          roles: data.roles,
          userId: data.user_id,
        },
      });

      if (user.roleType !== UserRole.staff) {
        await tx.user.update({
          where: {
            id: data.user_id,
          },
          data: {
            roleType: UserRole.staff,
          },
        });
      }

      if (auditActor) {
        const afterValue = await this.getStaffAuditSnapshot(tx, createdStaff.id);
        if (afterValue) {
          await this.actionHistoryService.recordCreate(tx, {
            actor: auditActor,
            entityType: 'staff',
            entityId: createdStaff.id,
            description: 'Tạo nhân sự',
            afterValue,
          });
        }
      }

      return createdStaff;
    });
  }
}
