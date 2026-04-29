import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/client';
import {
  AttendanceStatus,
  ClassStatus,
  LessonTaskStatus,
  StaffRole,
  StaffStatus,
  WalletTransactionType,
} from 'generated/enums';
import {
  type AdminDashboardActionAlertDto,
  type AdminDashboardBreakdownItemDto,
  type AdminDashboardClassPerformanceDto,
  type AdminDashboardDto,
  type AdminDashboardFinancialDetailDto,
  type AdminDashboardFinancialDetailItemDto,
  type AdminDashboardStudentBalanceItemDto,
  type AdminDashboardTopupHistoryItemDto,
  type AdminDashboardTrendPointDto,
  type AdminDashboardYearlySummaryDto,
  GetAdminDashboardQueryDto,
  GetAdminDashboardFinancialDetailQueryDto,
  GetAdminStudentBalanceDetailsQueryDto,
  GetStaffDashboardQueryDto,
  GetAdminTopupHistoryQueryDto,
  type StaffDashboardAccountantSectionDto,
  type StaffDashboardAssistantSectionDto,
  type StaffDashboardClassAlertItemDto,
  type StaffDashboardClassItemDto,
  type StaffDashboardCustomerCarePortfolioItemDto,
  type StaffDashboardCustomerCareSectionDto,
  type StaffDashboardDto,
  type StaffDashboardFinancialOverviewDto,
  type StaffDashboardLessonPlanHeadSectionDto,
  type StaffDashboardLessonPlanSectionDto,
  type StaffDashboardStudentAlertItemDto,
  type StaffDashboardSystemSummaryDto,
  type StaffDashboardTaskItemDto,
  type StaffDashboardTeacherSectionDto,
  type StaffDashboardTodaySessionItemDto,
  type StaffDashboardUnpaidStaffItemDto,
} from '../dtos/dashboard.dto';
import { DashboardCacheService } from '../cache/dashboard-cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { getUserFullNameFromParts } from '../common/user-name.util';

type SummaryCountRow = {
  activeClasses: number | string | null;
  activeStudents: number | string | null;
};

type AggregateMoneySqlRow = {
  totalAmount: number | string | null;
};

type MonthlyTrendSqlRow = {
  monthStart: Date | string;
  revenue: number | string | null;
  teacherCost: number | string | null;
  customerCareCost: number | string | null;
  lessonCost: number | string | null;
  bonusCost: number | string | null;
  extraAllowanceCost: number | string | null;
  operatingCost: number | string | null;
};

type StudentAlertSqlRow = {
  studentId: string;
  studentName: string;
  classNames: string;
  ownerName: string | null;
  accountBalance: number | string | null;
  referenceTuition: number | string | null;
  remainingSessions: number | string | null;
  debtAmount: number | string | null;
  totalCount: number | string | null;
  totalAmount: number | string | null;
};

type StaffUnpaidAlertSqlRow = {
  staffId: string;
  staffName: string;
  sessionAmount: number | string | null;
  bonusAmount: number | string | null;
  customerCareAmount: number | string | null;
  lessonAmount: number | string | null;
  extraAllowanceAmount: number | string | null;
  assistantAmount: number | string | null;
  totalUnpaid: number | string | null;
  totalCount: number | string | null;
  totalAmount: number | string | null;
  totalSessionAmount?: number | string | null;
  totalBonusAmount?: number | string | null;
  totalCustomerCareAmount?: number | string | null;
  totalLessonAmount?: number | string | null;
  totalExtraAllowanceAmount?: number | string | null;
  totalAssistantAmount?: number | string | null;
};

type ClassPerformanceSqlRow = {
  classId: string;
  name: string;
  students: number | string | null;
  revenue: number | string | null;
  profit: number | string | null;
  balanceRisk: number | string | null;
};

type QuarterClassCountSqlRow = {
  quarterNumber: number | string | null;
  classCount: number | string | null;
};

type TopupHistorySqlRow = {
  id: string;
  dateTime: Date | string;
  studentName: string;
  amount: number | string | null;
  note: string | null;
  cumulativeAfter: number | string | null;
};

type StudentBalanceDetailSqlRow = {
  studentId: string;
  studentName: string;
  className: string;
  balance: number | string | null;
};

type LearnedTuitionByClassSqlRow = {
  classId: string;
  className: string;
  totalAmount: number | string | null;
  studentCount: number | string | null;
  attendanceCount: number | string | null;
};

type MonthlyTrendNormalizedRow = {
  monthStart: Date;
  monthKey: string;
  monthLabel: string;
  revenue: number;
  teacherCost: number;
  customerCareCost: number;
  lessonCost: number;
  bonusCost: number;
  extraAllowanceCost: number;
  operatingCost: number;
  expense: number;
  profit: number;
};

function normalizeMoneyAmount(value: number | string | null | undefined) {
  const amount = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

function normalizeInteger(value: number | string | null | undefined) {
  const amount = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(amount) ? Math.floor(amount) : 0;
}

function buildDashboardRange(month?: string, year?: string) {
  const now = new Date();
  const normalizedYear = year ?? String(now.getFullYear());
  const normalizedMonth = month ?? String(now.getMonth() + 1).padStart(2, '0');
  const parsedYear = Number(normalizedYear);
  const parsedMonth = Number(normalizedMonth);

  const monthStart = new Date(parsedYear, parsedMonth - 1, 1);
  const monthEnd = new Date(parsedYear, parsedMonth, 1);
  const yearStart = new Date(parsedYear, 0, 1);
  const yearEnd = new Date(parsedYear + 1, 0, 1);

  return {
    month: normalizedMonth,
    year: normalizedYear,
    monthKey: `${normalizedYear}-${normalizedMonth}`,
    monthStart,
    monthEnd,
    yearStart,
    yearEnd,
  };
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthShort(date: Date) {
  return `T${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(month: string, year: string) {
  return `Tháng ${month} / ${year}`;
}

function formatCurrencyLabel(value: number) {
  return `${value.toLocaleString('vi-VN')}đ`;
}

function formatDateTimeLabel(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function formatStudentBalanceDue(row: StudentAlertSqlRow) {
  const remainingSessions = normalizeInteger(row.remainingSessions);
  if (remainingSessions <= 0) {
    return 'Cần nạp ngay';
  }

  return `Còn ${remainingSessions} buổi`;
}

function formatDebtDue(row: StudentAlertSqlRow) {
  const debtAmount = normalizeMoneyAmount(row.debtAmount);
  const referenceTuition = normalizeMoneyAmount(row.referenceTuition);

  if (referenceTuition <= 0) {
    return 'Số dư âm';
  }

  return `Thiếu khoảng ${Math.max(1, Math.ceil(debtAmount / referenceTuition))} buổi`;
}

function buildStaffUnpaidSourceLabel(row: StaffUnpaidAlertSqlRow) {
  const sources = [
    normalizeMoneyAmount(row.sessionAmount) > 0 ? 'buổi dạy' : null,
    normalizeMoneyAmount(row.bonusAmount) > 0 ? 'bonus' : null,
    normalizeMoneyAmount(row.customerCareAmount) > 0 ? 'CSKH' : null,
    normalizeMoneyAmount(row.lessonAmount) > 0 ? 'giáo án' : null,
    normalizeMoneyAmount(row.extraAllowanceAmount) > 0 ? 'trợ cấp' : null,
    normalizeMoneyAmount(row.assistantAmount) > 0 ? 'trợ lí 3%' : null,
  ].filter((value): value is string => value != null);

  if (sources.length === 0) {
    return 'Khoản chờ thanh toán';
  }

  if (sources.length === 1) {
    return sources[0];
  }

  return `${sources[0]} +${sources.length - 1} nguồn`;
}

function buildCacheKey(scope: string, params: Record<string, number | string>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    searchParams.set(key, String(value));
  }

  return `dashboard:${scope}:${searchParams.toString()}`;
}

function buildTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function buildWeekRange(anchorDate: Date) {
  const start = new Date(anchorDate);
  const day = start.getDay();
  const diffToMonday = (day + 6) % 7;
  start.setDate(start.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return { start, end };
}

function normalizeScheduleCount(schedule: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(schedule)) {
    return 0;
  }

  return schedule.filter(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'from' in item &&
      'to' in item &&
      typeof item.from === 'string' &&
      typeof item.to === 'string',
  ).length;
}

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toIsoTime(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  const seconds = String(value.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardCacheService: DashboardCacheService,
  ) {}

  private async getSummaryCounts(): Promise<SummaryCountRow> {
    const [row] = await this.prisma.$queryRaw<SummaryCountRow[]>(Prisma.sql`
      SELECT
        (
          SELECT COUNT(*)
          FROM classes
          WHERE classes.status = 'running'
        ) AS "activeClasses",
        (
          SELECT COUNT(DISTINCT student_classes.student_id)
          FROM student_classes
          INNER JOIN classes ON classes.id = student_classes.class_id
          INNER JOIN student_info ON student_info.id = student_classes.student_id
          WHERE classes.status = 'running'
            AND student_info.status = 'active'
        ) AS "activeStudents"
    `);

    return (
      row ?? {
        activeClasses: 0,
        activeStudents: 0,
      }
    );
  }

  private async getMonthlyTopupTotal(params: {
    monthStart: Date;
    monthEnd: Date;
  }): Promise<number> {
    const [row] = await this.prisma.$queryRaw<AggregateMoneySqlRow[]>(
      Prisma.sql`
        SELECT
          COALESCE(SUM(COALESCE(wallet_transactions_history.amount, 0)), 0) AS "totalAmount"
        FROM wallet_transactions_history
        WHERE wallet_transactions_history.type::text = 'topup'
          AND wallet_transactions_history.created_at >= ${params.monthStart}
          AND wallet_transactions_history.created_at < ${params.monthEnd}
      `,
    );

    return normalizeMoneyAmount(row?.totalAmount);
  }

  private async getTotalLearnedTuition(): Promise<number> {
    const [row] = await this.prisma.$queryRaw<AggregateMoneySqlRow[]>(
      Prisma.sql`
        SELECT
          COALESCE(SUM(COALESCE(attendance.tuition_fee, 0)), 0) AS "totalAmount"
        FROM attendance
        WHERE attendance.status IN ('present', 'excused')
      `,
    );

    return normalizeMoneyAmount(row?.totalAmount);
  }

  private async getLearnedTuitionByClass(limit: number) {
    return this.prisma.$queryRaw<LearnedTuitionByClassSqlRow[]>(Prisma.sql`
      SELECT
        classes.id AS "classId",
        classes.name AS "className",
        COALESCE(SUM(COALESCE(attendance.tuition_fee, 0)), 0) AS "totalAmount",
        COUNT(DISTINCT attendance.student_id) AS "studentCount",
        COUNT(attendance.id) AS "attendanceCount"
      FROM attendance
      INNER JOIN sessions ON sessions.id = attendance.session_id
      INNER JOIN classes ON classes.id = sessions.class_id
      WHERE attendance.status IN ('present', 'excused')
      GROUP BY classes.id, classes.name
      ORDER BY "totalAmount" DESC, classes.name ASC
      LIMIT ${limit}
    `);
  }

  private async getPrepaidTuitionTotal(): Promise<number> {
    const [row] = await this.prisma.$queryRaw<AggregateMoneySqlRow[]>(
      Prisma.sql`
        WITH eligible_students AS (
          SELECT
            student_info.id,
            COALESCE(student_info.account_balance, 0) AS balance
          FROM student_info
          WHERE student_info.status = 'active'
            AND COALESCE(student_info.account_balance, 0) > 0
            AND EXISTS (
              SELECT 1
              FROM student_classes
              INNER JOIN classes ON classes.id = student_classes.class_id
              WHERE student_classes.student_id = student_info.id
                AND classes.status = 'running'
            )
        )
        SELECT COALESCE(SUM(balance), 0) AS "totalAmount"
        FROM eligible_students
      `,
    );

    return normalizeMoneyAmount(row?.totalAmount);
  }

  private async getMonthlyTrend(params: {
    yearStart: Date;
    yearEnd: Date;
  }): Promise<MonthlyTrendNormalizedRow[]> {
    const yearStartMonthKey = formatMonthKey(params.yearStart);
    const yearEndMonthKeyExclusive = formatMonthKey(params.yearEnd);
    const yearStartDateKey = formatDateKey(params.yearStart);
    const yearEndDateKey = formatDateKey(params.yearEnd);

    const rows = await this.prisma.$queryRaw<MonthlyTrendSqlRow[]>(Prisma.sql`
      WITH month_series AS (
        SELECT generate_series(
          ${params.yearStart}::date,
          (${params.yearEnd}::date - INTERVAL '1 month')::date,
          INTERVAL '1 month'
        )::date AS month_start
      ),
      monthly_revenue AS (
        SELECT
          date_trunc('month', sessions.date)::date AS month_start,
          COALESCE(SUM(COALESCE(attendance.tuition_fee, 0)), 0) AS revenue
        FROM attendance
        INNER JOIN sessions ON sessions.id = attendance.session_id
        WHERE sessions.date >= ${params.yearStart}
          AND sessions.date < ${params.yearEnd}
          AND attendance.status IN ('present', 'excused')
        GROUP BY 1
      ),
      session_allowances AS (
        SELECT
          date_trunc('month', sessions.date)::date AS month_start,
          sessions.id AS session_id,
          LEAST(
            COALESCE(
              NULLIF(classes.max_allowance_per_session, 0),
              (
                (
                  COALESCE(sessions.allowance_amount, 0) *
                  COUNT(*) FILTER (WHERE attendance.status IN ('present', 'excused'))
                ) +
                COALESCE(classes.scale_amount, 0)
              ) * COALESCE(sessions.coefficient, 1)
            ),
            (
              (
                COALESCE(sessions.allowance_amount, 0) *
                COUNT(*) FILTER (WHERE attendance.status IN ('present', 'excused'))
              ) +
              COALESCE(classes.scale_amount, 0)
            ) * COALESCE(sessions.coefficient, 1)
          ) AS teacher_allowance_total
        FROM attendance
        INNER JOIN sessions ON sessions.id = attendance.session_id
        INNER JOIN classes ON classes.id = sessions.class_id
        WHERE sessions.date >= ${params.yearStart}
          AND sessions.date < ${params.yearEnd}
        GROUP BY
          1,
          sessions.id,
          sessions.allowance_amount,
          classes.scale_amount,
          classes.max_allowance_per_session,
          sessions.coefficient
      ),
      monthly_teacher_cost AS (
        SELECT
          month_start,
          COALESCE(SUM(teacher_allowance_total), 0) AS amount
        FROM session_allowances
        GROUP BY 1
      ),
      monthly_customer_care_cost AS (
        SELECT
          date_trunc('month', sessions.date)::date AS month_start,
          COALESCE(
            SUM(
              ROUND(
                (
                  COALESCE(attendance.tuition_fee, 0) *
                  COALESCE(attendance.customer_care_coef, 0)
                )::numeric,
                0
              )
            ),
            0
          ) AS amount
        FROM attendance
        INNER JOIN sessions ON sessions.id = attendance.session_id
        WHERE sessions.date >= ${params.yearStart}
          AND sessions.date < ${params.yearEnd}
        GROUP BY 1
      ),
      monthly_lesson_cost AS (
        SELECT
          date_trunc('month', lesson_outputs.date)::date AS month_start,
          COALESCE(SUM(COALESCE(lesson_outputs.cost, 0)), 0) AS amount
        FROM lesson_outputs
        WHERE lesson_outputs.date >= ${params.yearStart}
          AND lesson_outputs.date < ${params.yearEnd}
        GROUP BY 1
      ),
      monthly_bonus_cost AS (
        SELECT
          TO_DATE(CONCAT(bonuses.month, '-01'), 'YYYY-MM-DD') AS month_start,
          COALESCE(SUM(COALESCE(bonuses.amount, 0)), 0) AS amount
        FROM bonuses
        WHERE bonuses.month >= ${yearStartMonthKey}
          AND bonuses.month < ${yearEndMonthKeyExclusive}
        GROUP BY 1
      ),
      monthly_extra_allowance_cost AS (
        SELECT
          TO_DATE(CONCAT(extra_allowances.month, '-01'), 'YYYY-MM-DD') AS month_start,
          COALESCE(SUM(COALESCE(extra_allowances.amount, 0)), 0) AS amount
        FROM extra_allowances
        WHERE extra_allowances.month >= ${yearStartMonthKey}
          AND extra_allowances.month < ${yearEndMonthKeyExclusive}
        GROUP BY 1
      ),
      monthly_operating_cost AS (
        SELECT
          TO_DATE(
            CONCAT(
              COALESCE(
                NULLIF(cost_extend.month, ''),
                SUBSTRING(cost_extend.date FROM 1 FOR 7)
              ),
              '-01'
            ),
            'YYYY-MM-DD'
          ) AS month_start,
          COALESCE(SUM(COALESCE(cost_extend.amount, 0)), 0) AS amount
        FROM cost_extend
        WHERE (
          cost_extend.month IS NOT NULL
          AND cost_extend.month >= ${yearStartMonthKey}
          AND cost_extend.month < ${yearEndMonthKeyExclusive}
        ) OR (
          cost_extend.date IS NOT NULL
          AND cost_extend.date >= ${yearStartDateKey}
          AND cost_extend.date < ${yearEndDateKey}
        )
        GROUP BY 1
      )
      SELECT
        month_series.month_start AS "monthStart",
        COALESCE(monthly_revenue.revenue, 0) AS revenue,
        COALESCE(monthly_teacher_cost.amount, 0) AS "teacherCost",
        COALESCE(monthly_customer_care_cost.amount, 0) AS "customerCareCost",
        COALESCE(monthly_lesson_cost.amount, 0) AS "lessonCost",
        COALESCE(monthly_bonus_cost.amount, 0) AS "bonusCost",
        COALESCE(monthly_extra_allowance_cost.amount, 0) AS "extraAllowanceCost",
        COALESCE(monthly_operating_cost.amount, 0) AS "operatingCost"
      FROM month_series
      LEFT JOIN monthly_revenue ON monthly_revenue.month_start = month_series.month_start
      LEFT JOIN monthly_teacher_cost ON monthly_teacher_cost.month_start = month_series.month_start
      LEFT JOIN monthly_customer_care_cost ON monthly_customer_care_cost.month_start = month_series.month_start
      LEFT JOIN monthly_lesson_cost ON monthly_lesson_cost.month_start = month_series.month_start
      LEFT JOIN monthly_bonus_cost ON monthly_bonus_cost.month_start = month_series.month_start
      LEFT JOIN monthly_extra_allowance_cost ON monthly_extra_allowance_cost.month_start = month_series.month_start
      LEFT JOIN monthly_operating_cost ON monthly_operating_cost.month_start = month_series.month_start
      ORDER BY month_series.month_start ASC
    `);

    return rows.map((row) => {
      const monthStart =
        row.monthStart instanceof Date
          ? row.monthStart
          : new Date(row.monthStart);
      const revenue = normalizeMoneyAmount(row.revenue);
      const teacherCost = normalizeMoneyAmount(row.teacherCost);
      const customerCareCost = normalizeMoneyAmount(row.customerCareCost);
      const lessonCost = normalizeMoneyAmount(row.lessonCost);
      const bonusCost = normalizeMoneyAmount(row.bonusCost);
      const extraAllowanceCost = normalizeMoneyAmount(row.extraAllowanceCost);
      const operatingCost = normalizeMoneyAmount(row.operatingCost);
      const expense =
        teacherCost +
        customerCareCost +
        lessonCost +
        bonusCost +
        extraAllowanceCost +
        operatingCost;

      return {
        monthStart,
        monthKey: formatMonthKey(monthStart),
        monthLabel: formatMonthShort(monthStart),
        revenue,
        teacherCost,
        customerCareCost,
        lessonCost,
        bonusCost,
        extraAllowanceCost,
        operatingCost,
        expense,
        profit: revenue - expense,
      };
    });
  }

  private resolveSelectedMonthTrend(
    trendRows: MonthlyTrendNormalizedRow[],
    range: ReturnType<typeof buildDashboardRange>,
  ) {
    return (
      trendRows.find((item) => item.monthKey === range.monthKey) ??
      ({
        monthStart: range.monthStart,
        monthKey: range.monthKey,
        monthLabel: formatMonthShort(range.monthStart),
        revenue: 0,
        teacherCost: 0,
        customerCareCost: 0,
        lessonCost: 0,
        bonusCost: 0,
        extraAllowanceCost: 0,
        operatingCost: 0,
        expense: 0,
        profit: 0,
      } satisfies MonthlyTrendNormalizedRow)
    );
  }

  private async getExpiringStudents(limit: number) {
    return this.prisma.$queryRaw<StudentAlertSqlRow[]>(Prisma.sql`
      WITH student_financials AS (
        SELECT
          student_info.id AS "studentId",
          student_info.full_name AS "studentName",
          STRING_AGG(DISTINCT classes.name, ', ' ORDER BY classes.name) AS "classNames",
          NULLIF(
            TRIM(
              CONCAT(
                COALESCE(owner_user.first_name, ''),
                ' ',
                COALESCE(owner_user.last_name, '')
              )
            ),
            ''
          ) AS "ownerName",
          COALESCE(student_info.account_balance, 0) AS "accountBalance",
          MAX(
            COALESCE(
              NULLIF(student_classes.custom_student_tuition_per_session, 0),
              classes.student_tuition_per_session,
              CASE
                WHEN COALESCE(
                  NULLIF(student_classes.custom_tuition_package_session, 0),
                  classes.tuition_package_session
                ) > 0
                  THEN ROUND(
                    COALESCE(
                      NULLIF(student_classes.custom_tuition_package_total, 0),
                      classes.tuition_package_total
                    )::numeric /
                    COALESCE(
                      NULLIF(student_classes.custom_tuition_package_session, 0),
                      classes.tuition_package_session
                    )
                  )::int
                ELSE NULL
              END
            )
          ) AS "referenceTuition"
        FROM student_classes
        INNER JOIN classes ON classes.id = student_classes.class_id
        INNER JOIN student_info ON student_info.id = student_classes.student_id
        LEFT JOIN customer_care_service ON customer_care_service.student_id = student_info.id
        LEFT JOIN staff_info ON staff_info.id = customer_care_service.staff_id
        LEFT JOIN users owner_user ON owner_user.id = staff_info.user_id
        WHERE classes.status = 'running'
          AND student_info.status = 'active'
        GROUP BY
          student_info.id,
          student_info.full_name,
          student_info.account_balance,
          owner_user.last_name,
          owner_user.first_name
      ),
      eligible AS (
        SELECT
          "studentId",
          "studentName",
          "classNames",
          "ownerName",
          "accountBalance",
          "referenceTuition",
          FLOOR(
            "accountBalance"::numeric /
            NULLIF("referenceTuition", 0)
          )::int AS "remainingSessions"
        FROM student_financials
        WHERE "referenceTuition" IS NOT NULL
          AND "referenceTuition" > 0
          AND "accountBalance" >= 0
          AND "accountBalance" <= "referenceTuition" * 2
      ),
      counted AS (
        SELECT
          *,
          COUNT(*) OVER() AS "totalCount",
          COALESCE(SUM("accountBalance") OVER(), 0) AS "totalAmount"
        FROM eligible
      )
      SELECT
        "studentId",
        "studentName",
        "classNames",
        "ownerName",
        "accountBalance",
        "referenceTuition",
        "remainingSessions",
        0 AS "debtAmount",
        "totalCount",
        "totalAmount"
      FROM counted
      ORDER BY "remainingSessions" ASC, "accountBalance" ASC, "studentName" ASC
      LIMIT ${limit}
    `);
  }

  private async getDebtStudents(limit: number) {
    return this.prisma.$queryRaw<StudentAlertSqlRow[]>(Prisma.sql`
      WITH student_financials AS (
        SELECT
          student_info.id AS "studentId",
          student_info.full_name AS "studentName",
          STRING_AGG(DISTINCT classes.name, ', ' ORDER BY classes.name) AS "classNames",
          NULLIF(
            TRIM(
              CONCAT(
                COALESCE(owner_user.first_name, ''),
                ' ',
                COALESCE(owner_user.last_name, '')
              )
            ),
            ''
          ) AS "ownerName",
          COALESCE(student_info.account_balance, 0) AS "accountBalance",
          MAX(
            COALESCE(
              NULLIF(student_classes.custom_student_tuition_per_session, 0),
              classes.student_tuition_per_session,
              CASE
                WHEN COALESCE(
                  NULLIF(student_classes.custom_tuition_package_session, 0),
                  classes.tuition_package_session
                ) > 0
                  THEN ROUND(
                    COALESCE(
                      NULLIF(student_classes.custom_tuition_package_total, 0),
                      classes.tuition_package_total
                    )::numeric /
                    COALESCE(
                      NULLIF(student_classes.custom_tuition_package_session, 0),
                      classes.tuition_package_session
                    )
                  )::int
                ELSE NULL
              END
            )
          ) AS "referenceTuition"
        FROM student_classes
        INNER JOIN classes ON classes.id = student_classes.class_id
        INNER JOIN student_info ON student_info.id = student_classes.student_id
        LEFT JOIN customer_care_service ON customer_care_service.student_id = student_info.id
        LEFT JOIN staff_info ON staff_info.id = customer_care_service.staff_id
        LEFT JOIN users owner_user ON owner_user.id = staff_info.user_id
        WHERE classes.status = 'running'
          AND student_info.status = 'active'
        GROUP BY
          student_info.id,
          student_info.full_name,
          student_info.account_balance,
          owner_user.last_name,
          owner_user.first_name
      ),
      eligible AS (
        SELECT
          "studentId",
          "studentName",
          "classNames",
          "ownerName",
          "accountBalance",
          "referenceTuition",
          ABS("accountBalance") AS "debtAmount"
        FROM student_financials
        WHERE "accountBalance" < 0
      ),
      counted AS (
        SELECT
          *,
          COUNT(*) OVER() AS "totalCount",
          COALESCE(SUM("debtAmount") OVER(), 0) AS "totalAmount"
        FROM eligible
      )
      SELECT
        "studentId",
        "studentName",
        "classNames",
        "ownerName",
        "accountBalance",
        "referenceTuition",
        NULL AS "remainingSessions",
        "debtAmount",
        "totalCount",
        "totalAmount"
      FROM counted
      ORDER BY "debtAmount" DESC, "studentName" ASC
      LIMIT ${limit}
    `);
  }

  private async getUnpaidStaff(limit: number) {
    return this.prisma.$queryRaw<StaffUnpaidAlertSqlRow[]>(Prisma.sql`
      WITH active_staff AS (
        SELECT
          staff_info.id,
          NULLIF(
            TRIM(
              CONCAT(
                COALESCE(staff_user.first_name, ''),
                ' ',
                COALESCE(staff_user.last_name, '')
              )
            ),
            ''
          ) AS full_name
        FROM staff_info
        INNER JOIN users staff_user ON staff_user.id = staff_info.user_id
        WHERE staff_info.status = 'active'
      ),
      session_allowances AS (
        SELECT
          sessions.teacher_id AS staff_id,
          sessions.id AS session_id,
          LEAST(
            COALESCE(
              NULLIF(classes.max_allowance_per_session, 0),
              (
                (
                  COALESCE(sessions.allowance_amount, 0) *
                  COUNT(*) FILTER (WHERE attendance.status IN ('present', 'excused'))
                ) +
                COALESCE(classes.scale_amount, 0)
              ) * COALESCE(sessions.coefficient, 1)
            ),
            (
              (
                COALESCE(sessions.allowance_amount, 0) *
                COUNT(*) FILTER (WHERE attendance.status IN ('present', 'excused'))
              ) +
              COALESCE(classes.scale_amount, 0)
            ) * COALESCE(sessions.coefficient, 1)
          ) AS amount
        FROM attendance
        INNER JOIN sessions ON sessions.id = attendance.session_id
        INNER JOIN classes ON classes.id = sessions.class_id
        INNER JOIN active_staff ON active_staff.id = sessions.teacher_id
        WHERE LOWER(COALESCE(sessions.teacher_payment_status, '')) = 'unpaid'
        GROUP BY
          sessions.teacher_id,
          sessions.id,
          sessions.allowance_amount,
          classes.scale_amount,
          classes.max_allowance_per_session,
          sessions.coefficient
      ),
      session_unpaid AS (
        SELECT
          staff_id,
          COALESCE(SUM(amount), 0) AS amount
        FROM session_allowances
        GROUP BY staff_id
      ),
      bonus_unpaid AS (
        SELECT
          bonuses.staff_id AS staff_id,
          COALESCE(SUM(COALESCE(bonuses.amount, 0)), 0) AS amount
        FROM bonuses
        INNER JOIN active_staff ON active_staff.id = bonuses.staff_id
        WHERE bonuses.status::text = 'pending'
        GROUP BY bonuses.staff_id
      ),
      customer_care_unpaid AS (
        SELECT
          attendance.customer_care_staff_id AS staff_id,
          COALESCE(
            SUM(
              ROUND(
                (
                  COALESCE(attendance.tuition_fee, 0) *
                  COALESCE(attendance.customer_care_coef, 0)
                )::numeric,
                0
              )
            ),
            0
          ) AS amount
        FROM attendance
        INNER JOIN active_staff ON active_staff.id = attendance.customer_care_staff_id
        WHERE COALESCE(attendance.customer_care_payment_status::text, 'pending') = 'pending'
        GROUP BY attendance.customer_care_staff_id
      ),
      lesson_output_unpaid AS (
        SELECT
          lesson_outputs.staff_id AS staff_id,
          COALESCE(SUM(COALESCE(lesson_outputs.cost, 0)), 0) AS amount
        FROM lesson_outputs
        INNER JOIN active_staff ON active_staff.id = lesson_outputs.staff_id
        WHERE lesson_outputs.payment_status::text = 'pending'
        GROUP BY lesson_outputs.staff_id
      ),
      extra_allowance_unpaid AS (
        SELECT
          extra_allowances.staff_id AS staff_id,
          COALESCE(SUM(COALESCE(extra_allowances.amount, 0)), 0) AS amount
        FROM extra_allowances
        INNER JOIN active_staff ON active_staff.id = extra_allowances.staff_id
        WHERE extra_allowances.status::text = 'pending'
        GROUP BY extra_allowances.staff_id
      ),
      assistant_unpaid AS (
        SELECT
          attendance.assistant_manager_staff_id AS staff_id,
          COALESCE(
            SUM(
              ROUND(
                (COALESCE(attendance.tuition_fee, 0) * 0.03)::numeric,
                0
              )
            ),
            0
          ) AS amount
        FROM attendance
        INNER JOIN active_staff ON active_staff.id = attendance.assistant_manager_staff_id
        WHERE attendance.status IN ('present', 'excused')
          AND COALESCE(attendance.assistant_payment_status::text, 'pending') = 'pending'
        GROUP BY attendance.assistant_manager_staff_id
      ),
      combined AS (
        SELECT
          active_staff.id AS "staffId",
          active_staff.full_name AS "staffName",
          COALESCE(session_unpaid.amount, 0) AS "sessionAmount",
          COALESCE(bonus_unpaid.amount, 0) AS "bonusAmount",
          COALESCE(customer_care_unpaid.amount, 0) AS "customerCareAmount",
          COALESCE(lesson_output_unpaid.amount, 0) AS "lessonAmount",
          COALESCE(extra_allowance_unpaid.amount, 0) AS "extraAllowanceAmount",
          COALESCE(assistant_unpaid.amount, 0) AS "assistantAmount",
          (
            COALESCE(session_unpaid.amount, 0) +
            COALESCE(bonus_unpaid.amount, 0) +
            COALESCE(customer_care_unpaid.amount, 0) +
            COALESCE(lesson_output_unpaid.amount, 0) +
            COALESCE(extra_allowance_unpaid.amount, 0) +
            COALESCE(assistant_unpaid.amount, 0)
          ) AS "totalUnpaid"
        FROM active_staff
        LEFT JOIN session_unpaid ON session_unpaid.staff_id = active_staff.id
        LEFT JOIN bonus_unpaid ON bonus_unpaid.staff_id = active_staff.id
        LEFT JOIN customer_care_unpaid ON customer_care_unpaid.staff_id = active_staff.id
        LEFT JOIN lesson_output_unpaid ON lesson_output_unpaid.staff_id = active_staff.id
        LEFT JOIN extra_allowance_unpaid ON extra_allowance_unpaid.staff_id = active_staff.id
        LEFT JOIN assistant_unpaid ON assistant_unpaid.staff_id = active_staff.id
      ),
      filtered AS (
        SELECT *
        FROM combined
        WHERE "totalUnpaid" > 0
      ),
      counted AS (
        SELECT
          *,
          COUNT(*) OVER() AS "totalCount",
          COALESCE(SUM("totalUnpaid") OVER(), 0) AS "totalAmount",
          COALESCE(SUM("sessionAmount") OVER(), 0) AS "totalSessionAmount",
          COALESCE(SUM("bonusAmount") OVER(), 0) AS "totalBonusAmount",
          COALESCE(
            SUM("customerCareAmount") OVER(),
            0
          ) AS "totalCustomerCareAmount",
          COALESCE(SUM("lessonAmount") OVER(), 0) AS "totalLessonAmount",
          COALESCE(
            SUM("extraAllowanceAmount") OVER(),
            0
          ) AS "totalExtraAllowanceAmount",
          COALESCE(SUM("assistantAmount") OVER(), 0) AS "totalAssistantAmount"
        FROM filtered
      )
      SELECT
        "staffId",
        "staffName",
        "sessionAmount",
        "bonusAmount",
        "customerCareAmount",
        "lessonAmount",
        "extraAllowanceAmount",
        "assistantAmount",
        "totalUnpaid",
        "totalCount",
        "totalAmount",
        "totalSessionAmount",
        "totalBonusAmount",
        "totalCustomerCareAmount",
        "totalLessonAmount",
        "totalExtraAllowanceAmount",
        "totalAssistantAmount"
      FROM counted
      ORDER BY "totalUnpaid" DESC, "staffName" ASC
      LIMIT ${limit}
    `);
  }

  private async getTopClasses(params: {
    monthStart: Date;
    monthEnd: Date;
    limit: number;
  }) {
    return this.prisma.$queryRaw<ClassPerformanceSqlRow[]>(Prisma.sql`
      WITH class_revenue AS (
        SELECT
          sessions.class_id AS class_id,
          COALESCE(SUM(COALESCE(attendance.tuition_fee, 0)), 0) AS revenue
        FROM attendance
        INNER JOIN sessions ON sessions.id = attendance.session_id
        WHERE sessions.date >= ${params.monthStart}
          AND sessions.date < ${params.monthEnd}
          AND attendance.status IN ('present', 'excused')
        GROUP BY sessions.class_id
      ),
      class_allowances AS (
        SELECT
          sessions.class_id AS class_id,
          sessions.id AS session_id,
          LEAST(
            COALESCE(
              NULLIF(classes.max_allowance_per_session, 0),
              (
                (
                  COALESCE(sessions.allowance_amount, 0) *
                  COUNT(*) FILTER (WHERE attendance.status IN ('present', 'excused'))
                ) +
                COALESCE(classes.scale_amount, 0)
              ) * COALESCE(sessions.coefficient, 1)
            ),
            (
              (
                COALESCE(sessions.allowance_amount, 0) *
                COUNT(*) FILTER (WHERE attendance.status IN ('present', 'excused'))
              ) +
              COALESCE(classes.scale_amount, 0)
            ) * COALESCE(sessions.coefficient, 1)
          ) AS teacher_allowance_total
        FROM attendance
        INNER JOIN sessions ON sessions.id = attendance.session_id
        INNER JOIN classes ON classes.id = sessions.class_id
        WHERE sessions.date >= ${params.monthStart}
          AND sessions.date < ${params.monthEnd}
        GROUP BY
          sessions.class_id,
          sessions.id,
          sessions.allowance_amount,
          classes.scale_amount,
          classes.max_allowance_per_session,
          sessions.coefficient
      ),
      class_allowance_totals AS (
        SELECT
          class_id,
          COALESCE(SUM(teacher_allowance_total), 0) AS teacher_cost
        FROM class_allowances
        GROUP BY class_id
      ),
      class_members AS (
        SELECT
          student_classes.class_id AS class_id,
          COUNT(DISTINCT student_classes.student_id) FILTER (
            WHERE student_info.status = 'active'
          ) AS students,
          COALESCE(
            SUM(
              CASE
                WHEN COALESCE(student_info.account_balance, 0) < 0
                  THEN ABS(COALESCE(student_info.account_balance, 0))
                ELSE 0
              END
            ),
            0
          ) AS balance_risk
        FROM student_classes
        INNER JOIN student_info ON student_info.id = student_classes.student_id
        GROUP BY student_classes.class_id
      )
      SELECT
        classes.id AS "classId",
        classes.name AS name,
        COALESCE(class_members.students, 0) AS students,
        COALESCE(class_revenue.revenue, 0) AS revenue,
        COALESCE(class_revenue.revenue, 0) - COALESCE(class_allowance_totals.teacher_cost, 0) AS profit,
        COALESCE(class_members.balance_risk, 0) AS "balanceRisk"
      FROM classes
      LEFT JOIN class_revenue ON class_revenue.class_id = classes.id
      LEFT JOIN class_allowance_totals ON class_allowance_totals.class_id = classes.id
      LEFT JOIN class_members ON class_members.class_id = classes.id
      WHERE classes.status = 'running'
      ORDER BY COALESCE(class_revenue.revenue, 0) DESC, classes.name ASC
      LIMIT ${params.limit}
    `);
  }

  private async getQuarterClassCounts(params: {
    yearStart: Date;
    yearEnd: Date;
  }) {
    return this.prisma.$queryRaw<QuarterClassCountSqlRow[]>(Prisma.sql`
      SELECT
        EXTRACT(QUARTER FROM sessions.date)::int AS "quarterNumber",
        COUNT(DISTINCT sessions.class_id) AS "classCount"
      FROM sessions
      WHERE sessions.date >= ${params.yearStart}
        AND sessions.date < ${params.yearEnd}
      GROUP BY 1
    `);
  }

  private sortTaskItems(items: StaffDashboardTaskItemDto[]) {
    return [...items].sort((left, right) => {
      if (left.dueDate && right.dueDate) {
        return left.dueDate.localeCompare(right.dueDate);
      }

      if (left.dueDate) {
        return -1;
      }

      if (right.dueDate) {
        return 1;
      }

      return (left.title ?? '').localeCompare(right.title ?? '');
    });
  }

  private mapTaskItem(task: {
    id: string;
    title: string | null;
    status: string;
    priority: string;
    dueDate: Date | null;
    createdByStaff:
      | {
          user: { first_name: string | null; last_name: string | null } | null;
        }
      | null;
    staffLessonTasks: Array<{
      staff: {
        user: { first_name: string | null; last_name: string | null } | null;
      };
    }>;
  }): StaffDashboardTaskItemDto {
    const assigneeNames = Array.from(
      new Set(
        task.staffLessonTasks
          .map((assignment) =>
            getUserFullNameFromParts(assignment.staff.user)?.trim(),
          )
          .filter((name): name is string => Boolean(name)),
      ),
    );

    return {
      taskId: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: toIsoDate(task.dueDate),
      responsibleName:
        getUserFullNameFromParts(task.createdByStaff?.user)?.trim() || null,
      assigneeNames,
    };
  }

  private mapStudentAlertItem(row: StudentAlertSqlRow): StaffDashboardStudentAlertItemDto {
    return {
      studentId: row.studentId,
      studentName: row.studentName,
      classNames: row.classNames,
      accountBalance: normalizeMoneyAmount(row.accountBalance),
      referenceTuition:
        normalizeMoneyAmount(row.referenceTuition) > 0
          ? normalizeMoneyAmount(row.referenceTuition)
          : null,
      dueLabel:
        normalizeMoneyAmount(row.debtAmount) > 0
          ? formatDebtDue(row)
          : formatStudentBalanceDue(row),
    };
  }

  private async getTeacherSection(
    staffId: string,
    todayRange: { start: Date; end: Date },
  ): Promise<StaffDashboardTeacherSectionDto> {
    const [assignedClasses, latestSurveyAggregate, todaySessions] =
      await Promise.all([
        this.prisma.class.findMany({
          where: {
            status: ClassStatus.running,
            teachers: {
              some: {
                teacherId: staffId,
              },
            },
          },
          select: {
            id: true,
            name: true,
            schedule: true,
            _count: {
              select: {
                surveys: true,
                students: true,
              },
            },
          },
        }),
        this.prisma.classSurvey.aggregate({
          where: {
            class: {
              status: ClassStatus.running,
            },
          },
          _max: {
            testNumber: true,
          },
        }),
        this.prisma.session.findMany({
          where: {
            teacherId: staffId,
            date: {
              gte: todayRange.start,
              lt: todayRange.end,
            },
          },
          select: {
            id: true,
            startTime: true,
            endTime: true,
            teacherPaymentStatus: true,
            class: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                attendance: true,
              },
            },
          },
          orderBy: [
            { startTime: 'asc' },
            { classId: 'asc' },
          ],
        }),
      ]);

    const assignedClassesIds = assignedClasses.map((item) => item.id);
    const latestSurveyRows =
      assignedClassesIds.length > 0
        ? await this.prisma.classSurvey.groupBy({
            by: ['classId'],
            where: {
              classId: {
                in: assignedClassesIds,
              },
            },
            _max: {
              testNumber: true,
            },
          })
        : [];

    const latestRequiredSurveyTestNumber =
      latestSurveyAggregate._max.testNumber ?? null;
    const latestSurveyByClassId = new Map(
      latestSurveyRows
        .filter((row) => row.classId != null)
        .map((row) => [row.classId as string, row._max.testNumber ?? null]),
    );

    const classItems: StaffDashboardClassItemDto[] = assignedClasses
      .map((item) => ({
        id: item.id,
        name: item.name,
        studentCount: item._count.students,
        scheduleCount: normalizeScheduleCount(item.schedule),
        surveyCount: item._count.surveys,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    const missingScheduleOrSurvey: StaffDashboardClassAlertItemDto[] = classItems
      .map((item) => {
        const latestClassSurveyTestNumber =
          latestSurveyByClassId.get(item.id) ?? null;
        const missingSchedule = item.scheduleCount === 0;
        const missingSurvey =
          (latestRequiredSurveyTestNumber ?? 0) > 0 &&
          (latestClassSurveyTestNumber ?? 0) < (latestRequiredSurveyTestNumber ?? 0);

        if (!missingSchedule && !missingSurvey) {
          return null;
        }

        const reasons = [
          missingSchedule ? 'Chưa điền lịch học' : null,
          missingSurvey && latestRequiredSurveyTestNumber
            ? `Chưa báo cáo khảo sát lần ${latestRequiredSurveyTestNumber}`
            : null,
        ].filter((value): value is string => value != null);

        return {
          classId: item.id,
          className: item.name,
          reason: reasons.join(' • '),
          missingSchedule,
          missingSurvey,
          latestRequiredSurveyTestNumber,
          latestClassSurveyTestNumber,
        };
      })
      .filter((item): item is StaffDashboardClassAlertItemDto => item != null)
      .sort((left, right) => left.className.localeCompare(right.className));

    const todaySessionItems: StaffDashboardTodaySessionItemDto[] = todaySessions.map(
      (session) => ({
        sessionId: session.id,
        classId: session.class.id,
        className: session.class.name,
        startTime: toIsoTime(session.startTime),
        endTime: toIsoTime(session.endTime),
        attendanceCount: session._count.attendance,
        teacherPaymentStatus: session.teacherPaymentStatus,
      }),
    );

    return {
      assignedClasses: classItems,
      missingScheduleOrSurvey,
      todaySessions: todaySessionItems,
    };
  }

  private async getLessonPlanSection(
    staffId: string,
  ): Promise<StaffDashboardLessonPlanSectionDto> {
    const [totalTaskCount, completedTaskCount, remainingTaskCount, openTaskRecords] =
      await Promise.all([
        this.prisma.lessonTask.count({
          where: {
            staffLessonTasks: {
              some: {
                staffId,
              },
            },
          },
        }),
        this.prisma.lessonTask.count({
          where: {
            staffLessonTasks: {
              some: {
                staffId,
              },
            },
            status: LessonTaskStatus.completed,
          },
        }),
        this.prisma.lessonTask.count({
          where: {
            staffLessonTasks: {
              some: {
                staffId,
              },
            },
            status: {
              in: [LessonTaskStatus.pending, LessonTaskStatus.in_progress],
            },
          },
        }),
        this.prisma.lessonTask.findMany({
          where: {
            staffLessonTasks: {
              some: {
                staffId,
              },
            },
            status: {
              in: [LessonTaskStatus.pending, LessonTaskStatus.in_progress],
            },
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            createdByStaff: {
              select: {
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                  },
                },
              },
            },
            staffLessonTasks: {
              select: {
                staff: {
                  select: {
                    user: {
                      select: {
                        first_name: true,
                        last_name: true,
                      },
                    },
                  },
                },
              },
            },
          },
          take: 24,
        }),
      ]);

    return {
      totalTaskCount,
      completedTaskCount,
      remainingTaskCount,
      openTasks: this.sortTaskItems(
        openTaskRecords.map((task) => this.mapTaskItem(task)),
      ).slice(0, 6),
    };
  }

  private async getLessonPlanHeadSection(params: {
    monthStart: Date;
    monthEnd: Date;
    weekStart: Date;
    weekEnd: Date;
  }): Promise<StaffDashboardLessonPlanHeadSectionDto> {
    const [incompleteTaskRecords, totalOutputs, newOutputsThisMonth, newOutputsThisWeek] =
      await Promise.all([
        this.prisma.lessonTask.findMany({
          where: {
            status: {
              in: [LessonTaskStatus.pending, LessonTaskStatus.in_progress],
            },
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            createdByStaff: {
              select: {
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                  },
                },
              },
            },
            staffLessonTasks: {
              select: {
                staff: {
                  select: {
                    user: {
                      select: {
                        first_name: true,
                        last_name: true,
                      },
                    },
                  },
                },
              },
            },
          },
          take: 24,
        }),
        this.prisma.lessonOutput.count(),
        this.prisma.lessonOutput.count({
          where: {
            createdAt: {
              gte: params.monthStart,
              lt: params.monthEnd,
            },
          },
        }),
        this.prisma.lessonOutput.count({
          where: {
            createdAt: {
              gte: params.weekStart,
              lt: params.weekEnd,
            },
          },
        }),
      ]);

    return {
      incompleteTasks: this.sortTaskItems(
        incompleteTaskRecords.map((task) => this.mapTaskItem(task)),
      ).slice(0, 8),
      lessonOutputTotals: {
        totalOutputs,
        newOutputsThisMonth,
        newOutputsThisWeek,
      },
    };
  }

  private async getActiveTeacherCount() {
    return this.prisma.staffInfo.count({
      where: {
        status: StaffStatus.active,
        roles: {
          has: StaffRole.teacher,
        },
      },
    });
  }

  private async getStudentAggregateMaps(studentIds: string[]) {
    const normalizedStudentIds = Array.from(new Set(studentIds));

    if (normalizedStudentIds.length === 0) {
      return {
        learnedTuitionByStudentId: new Map<string, number>(),
        topupByStudentId: new Map<string, number>(),
      };
    }

    const [learnedTuitionRows, topupRows] = await Promise.all([
      this.prisma.attendance.groupBy({
        by: ['studentId'],
        where: {
          studentId: {
            in: normalizedStudentIds,
          },
          status: {
            in: [AttendanceStatus.present, AttendanceStatus.excused],
          },
        },
        _sum: {
          tuitionFee: true,
        },
      }),
      this.prisma.walletTransactionsHistory.groupBy({
        by: ['studentId'],
        where: {
          studentId: {
            in: normalizedStudentIds,
          },
          type: WalletTransactionType.topup,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      learnedTuitionByStudentId: new Map(
        learnedTuitionRows.map((row) => [
          row.studentId,
          normalizeMoneyAmount(row._sum.tuitionFee),
        ]),
      ),
      topupByStudentId: new Map(
        topupRows.map((row) => [
          row.studentId,
          normalizeMoneyAmount(row._sum.amount),
        ]),
      ),
    };
  }

  private async getCustomerCarePortfolios(
    staffIds?: string[],
  ): Promise<StaffDashboardCustomerCarePortfolioItemDto[]> {
    const customerCareStaff = await this.prisma.staffInfo.findMany({
      where: {
        status: StaffStatus.active,
        roles: {
          has: StaffRole.customer_care,
        },
        ...(staffIds?.length
          ? {
              id: {
                in: staffIds,
              },
            }
          : {}),
      },
      select: {
        id: true,
        user: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    if (customerCareStaff.length === 0) {
      return [];
    }

    const assignments = await this.prisma.customerCareService.findMany({
      where: {
        staffId: {
          in: customerCareStaff.map((staff) => staff.id),
        },
      },
      select: {
        staffId: true,
        student: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const { learnedTuitionByStudentId, topupByStudentId } =
      await this.getStudentAggregateMaps(
        assignments.map((assignment) => assignment.student.id),
      );

    const portfolioByStaffId = new Map(
      customerCareStaff.map((staff) => [
        staff.id,
        {
          staffId: staff.id,
          staffName: getUserFullNameFromParts(staff.user) ?? '',
          activeStudentCount: 0,
          learnedTuitionTotal: 0,
          topupTotal: 0,
        },
      ]),
    );

    assignments.forEach((assignment) => {
      const portfolio = portfolioByStaffId.get(assignment.staffId);
      if (!portfolio) {
        return;
      }

      if (assignment.student.status === 'active') {
        portfolio.activeStudentCount += 1;
      }

      portfolio.learnedTuitionTotal +=
        learnedTuitionByStudentId.get(assignment.student.id) ?? 0;
      portfolio.topupTotal += topupByStudentId.get(assignment.student.id) ?? 0;
    });

    return Array.from(portfolioByStaffId.values())
      .filter(
        (item) =>
          item.activeStudentCount > 0 ||
          item.learnedTuitionTotal > 0 ||
          item.topupTotal > 0,
      )
      .sort((left, right) => {
        if (right.topupTotal !== left.topupTotal) {
          return right.topupTotal - left.topupTotal;
        }

        if (right.learnedTuitionTotal !== left.learnedTuitionTotal) {
          return right.learnedTuitionTotal - left.learnedTuitionTotal;
        }

        return left.staffName.localeCompare(right.staffName);
      });
  }

  private async getExpiringStudentsByCustomerCareStaff(
    staffId: string,
    limit: number,
  ) {
    return this.prisma.$queryRaw<StudentAlertSqlRow[]>(Prisma.sql`
      WITH student_financials AS (
        SELECT
          student_info.id AS "studentId",
          student_info.full_name AS "studentName",
          STRING_AGG(DISTINCT classes.name, ', ' ORDER BY classes.name) AS "classNames",
          NULLIF(
            TRIM(
              CONCAT(
                COALESCE(owner_user.first_name, ''),
                ' ',
                COALESCE(owner_user.last_name, '')
              )
            ),
            ''
          ) AS "ownerName",
          COALESCE(student_info.account_balance, 0) AS "accountBalance",
          MAX(
            COALESCE(
              NULLIF(student_classes.custom_student_tuition_per_session, 0),
              classes.student_tuition_per_session,
              CASE
                WHEN COALESCE(
                  NULLIF(student_classes.custom_tuition_package_session, 0),
                  classes.tuition_package_session
                ) > 0
                  THEN ROUND(
                    COALESCE(
                      NULLIF(student_classes.custom_tuition_package_total, 0),
                      classes.tuition_package_total
                    )::numeric /
                    COALESCE(
                      NULLIF(student_classes.custom_tuition_package_session, 0),
                      classes.tuition_package_session
                    )
                  )::int
                ELSE NULL
              END
            )
          ) AS "referenceTuition"
        FROM customer_care_service
        INNER JOIN student_info ON student_info.id = customer_care_service.student_id
        INNER JOIN staff_info ON staff_info.id = customer_care_service.staff_id
        INNER JOIN users owner_user ON owner_user.id = staff_info.user_id
        INNER JOIN student_classes ON student_classes.student_id = student_info.id
        INNER JOIN classes ON classes.id = student_classes.class_id
        WHERE customer_care_service.staff_id = ${staffId}
          AND classes.status = 'running'
          AND student_info.status = 'active'
        GROUP BY
          student_info.id,
          student_info.full_name,
          student_info.account_balance,
          owner_user.last_name,
          owner_user.first_name
      ),
      eligible AS (
        SELECT
          "studentId",
          "studentName",
          "classNames",
          "ownerName",
          "accountBalance",
          "referenceTuition",
          FLOOR(
            "accountBalance"::numeric /
            NULLIF("referenceTuition", 0)
          )::int AS "remainingSessions"
        FROM student_financials
        WHERE "referenceTuition" IS NOT NULL
          AND "referenceTuition" > 0
          AND "accountBalance" >= 0
          AND "accountBalance" <= "referenceTuition" * 2
      ),
      counted AS (
        SELECT
          *,
          COUNT(*) OVER() AS "totalCount",
          COALESCE(SUM("accountBalance") OVER(), 0) AS "totalAmount"
        FROM eligible
      )
      SELECT
        "studentId",
        "studentName",
        "classNames",
        "ownerName",
        "accountBalance",
        "referenceTuition",
        "remainingSessions",
        0 AS "debtAmount",
        "totalCount",
        "totalAmount"
      FROM counted
      ORDER BY "remainingSessions" ASC, "accountBalance" ASC, "studentName" ASC
      LIMIT ${limit}
    `);
  }

  private async getDebtStudentsByCustomerCareStaff(
    staffId: string,
    limit: number,
  ) {
    return this.prisma.$queryRaw<StudentAlertSqlRow[]>(Prisma.sql`
      WITH student_financials AS (
        SELECT
          student_info.id AS "studentId",
          student_info.full_name AS "studentName",
          STRING_AGG(DISTINCT classes.name, ', ' ORDER BY classes.name) AS "classNames",
          NULLIF(
            TRIM(
              CONCAT(
                COALESCE(owner_user.first_name, ''),
                ' ',
                COALESCE(owner_user.last_name, '')
              )
            ),
            ''
          ) AS "ownerName",
          COALESCE(student_info.account_balance, 0) AS "accountBalance",
          MAX(
            COALESCE(
              NULLIF(student_classes.custom_student_tuition_per_session, 0),
              classes.student_tuition_per_session,
              CASE
                WHEN COALESCE(
                  NULLIF(student_classes.custom_tuition_package_session, 0),
                  classes.tuition_package_session
                ) > 0
                  THEN ROUND(
                    COALESCE(
                      NULLIF(student_classes.custom_tuition_package_total, 0),
                      classes.tuition_package_total
                    )::numeric /
                    COALESCE(
                      NULLIF(student_classes.custom_tuition_package_session, 0),
                      classes.tuition_package_session
                    )
                  )::int
                ELSE NULL
              END
            )
          ) AS "referenceTuition"
        FROM customer_care_service
        INNER JOIN student_info ON student_info.id = customer_care_service.student_id
        INNER JOIN staff_info ON staff_info.id = customer_care_service.staff_id
        INNER JOIN users owner_user ON owner_user.id = staff_info.user_id
        INNER JOIN student_classes ON student_classes.student_id = student_info.id
        INNER JOIN classes ON classes.id = student_classes.class_id
        WHERE customer_care_service.staff_id = ${staffId}
          AND classes.status = 'running'
          AND student_info.status = 'active'
        GROUP BY
          student_info.id,
          student_info.full_name,
          student_info.account_balance,
          owner_user.last_name,
          owner_user.first_name
      ),
      eligible AS (
        SELECT
          "studentId",
          "studentName",
          "classNames",
          "ownerName",
          "accountBalance",
          "referenceTuition",
          ABS("accountBalance") AS "debtAmount"
        FROM student_financials
        WHERE "accountBalance" < 0
      ),
      counted AS (
        SELECT
          *,
          COUNT(*) OVER() AS "totalCount",
          COALESCE(SUM("debtAmount") OVER(), 0) AS "totalAmount"
        FROM eligible
      )
      SELECT
        "studentId",
        "studentName",
        "classNames",
        "ownerName",
        "accountBalance",
        "referenceTuition",
        NULL AS "remainingSessions",
        "debtAmount",
        "totalCount",
        "totalAmount"
      FROM counted
      ORDER BY "debtAmount" DESC, "studentName" ASC
      LIMIT ${limit}
    `);
  }

  private async getCustomerCareSection(
    staffId: string,
    range: { monthStart: Date; monthEnd: Date },
  ): Promise<StaffDashboardCustomerCareSectionDto> {
    const assignments = await this.prisma.customerCareService.findMany({
      where: {
        staffId,
      },
      select: {
        student: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            dropOutDate: true,
          },
        },
      },
    });

    const assignedStudents = assignments.map((assignment) => assignment.student);
    const { learnedTuitionByStudentId, topupByStudentId } =
      await this.getStudentAggregateMaps(
        assignedStudents.map((student) => student.id),
      );

    const [lowBalanceRows, debtRows] = await Promise.all([
      this.getExpiringStudentsByCustomerCareStaff(staffId, 6),
      this.getDebtStudentsByCustomerCareStaff(staffId, 6),
    ]);

    const learnedTuitionTotal = assignedStudents.reduce(
      (sum, student) => sum + (learnedTuitionByStudentId.get(student.id) ?? 0),
      0,
    );
    const topupTotal = assignedStudents.reduce(
      (sum, student) => sum + (topupByStudentId.get(student.id) ?? 0),
      0,
    );

    return {
      newStudentsThisMonth: assignedStudents.filter(
        (student) =>
          student.createdAt >= range.monthStart &&
          student.createdAt < range.monthEnd,
      ).length,
      droppedStudentsThisMonth: assignedStudents.filter(
        (student) =>
          student.dropOutDate != null &&
          student.dropOutDate >= range.monthStart &&
          student.dropOutDate < range.monthEnd,
      ).length,
      activeStudentsCount: assignedStudents.filter(
        (student) => student.status === 'active',
      ).length,
      learnedTuitionTotal,
      topupTotal,
      lowBalanceStudents: lowBalanceRows.map((row) => this.mapStudentAlertItem(row)),
      debtStudents: debtRows.map((row) => this.mapStudentAlertItem(row)),
    };
  }

  private async getAssistantSection(
    range: { month: string; year: string },
  ): Promise<StaffDashboardAssistantSectionDto> {
    const [adminDashboard, summaryCounts, activeTeachers, customerCarePortfolios] =
      await Promise.all([
        this.getAdminDashboard({
          month: range.month,
          year: range.year,
          alertLimit: 6,
          topClassLimit: 5,
        }),
        this.getSummaryCounts(),
        this.getActiveTeacherCount(),
        this.getCustomerCarePortfolios(),
      ]);

    const systemSummary: StaffDashboardSystemSummaryDto = {
      activeClasses: normalizeInteger(summaryCounts.activeClasses),
      activeStudents: normalizeInteger(summaryCounts.activeStudents),
      activeTeachers,
    };

    return {
      actionAlerts: adminDashboard.actionAlerts,
      systemSummary,
      customerCarePortfolios,
    };
  }

  private async getAccountantSection(
    range: { month: string; year: string },
  ): Promise<StaffDashboardAccountantSectionDto> {
    const [adminDashboard, unpaidRows] = await Promise.all([
      this.getAdminDashboard({
        month: range.month,
        year: range.year,
        alertLimit: 6,
        topClassLimit: 5,
      }),
      this.getUnpaidStaff(6),
    ]);

    const financialOverview: StaffDashboardFinancialOverviewDto = {
      period: adminDashboard.period,
      summary: adminDashboard.summary,
      breakdown: adminDashboard.breakdown,
    };

    const unpaidStaff: StaffDashboardUnpaidStaffItemDto[] = unpaidRows.map(
      (row) => ({
        staffId: row.staffId,
        staffName: row.staffName,
        sessionAmount: normalizeMoneyAmount(row.sessionAmount),
        bonusAmount: normalizeMoneyAmount(row.bonusAmount),
        customerCareAmount: normalizeMoneyAmount(row.customerCareAmount),
        lessonAmount: normalizeMoneyAmount(row.lessonAmount),
        extraAllowanceAmount: normalizeMoneyAmount(row.extraAllowanceAmount),
        totalUnpaid: normalizeMoneyAmount(row.totalUnpaid),
      }),
    );

    return {
      unpaidStaff,
      financialOverview,
    };
  }

  async getStaffDashboard(params: {
    staffId: string;
    staffRoles: StaffRole[];
    query: GetStaffDashboardQueryDto;
  }): Promise<StaffDashboardDto> {
    const normalizedRoles = Array.from(new Set(params.staffRoles));
    const range = buildDashboardRange(params.query.month, params.query.year);
    const todayRange = buildTodayRange();
    const weekRange = buildWeekRange(todayRange.start);
    const hasLessonPlanHead = normalizedRoles.includes(StaffRole.lesson_plan_head);
    const hasLessonPlan =
      normalizedRoles.includes(StaffRole.lesson_plan) && !hasLessonPlanHead;

    return this.dashboardCacheService.wrapJson({
      key: buildCacheKey('staff-self', {
        staffId: params.staffId,
        month: range.month,
        year: range.year,
        today: formatDateKey(todayRange.start),
        roles: normalizedRoles.slice().sort().join(',') || 'none',
      }),
      cacheType: 'staff-self',
      ttlSeconds: 60,
      loader: async () => {
        const [
          teacher,
          lessonPlan,
          lessonPlanHead,
          assistant,
          customerCare,
          accountant,
        ] = await Promise.all([
          normalizedRoles.includes(StaffRole.teacher)
            ? this.getTeacherSection(params.staffId, todayRange)
            : Promise.resolve(undefined),
          hasLessonPlan
            ? this.getLessonPlanSection(params.staffId)
            : Promise.resolve(undefined),
          hasLessonPlanHead
            ? this.getLessonPlanHeadSection({
                monthStart: range.monthStart,
                monthEnd: range.monthEnd,
                weekStart: weekRange.start,
                weekEnd: weekRange.end,
              })
            : Promise.resolve(undefined),
          normalizedRoles.includes(StaffRole.assistant)
            ? this.getAssistantSection({
                month: range.month,
                year: range.year,
              })
            : Promise.resolve(undefined),
          normalizedRoles.includes(StaffRole.customer_care)
            ? this.getCustomerCareSection(params.staffId, {
                monthStart: range.monthStart,
                monthEnd: range.monthEnd,
              })
            : Promise.resolve(undefined),
          normalizedRoles.includes(StaffRole.accountant)
            ? this.getAccountantSection({
                month: range.month,
                year: range.year,
              })
            : Promise.resolve(undefined),
        ]);

        return {
          ...(teacher ? { teacher } : {}),
          ...(lessonPlan ? { lessonPlan } : {}),
          ...(lessonPlanHead ? { lessonPlanHead } : {}),
          ...(assistant ? { assistant } : {}),
          ...(customerCare ? { customerCare } : {}),
          ...(accountant ? { accountant } : {}),
        };
      },
    });
  }

  async getAdminDashboard(
    query: GetAdminDashboardQueryDto,
  ): Promise<AdminDashboardDto> {
    const alertLimit =
      typeof query.alertLimit === 'number' ? query.alertLimit : 6;
    const topClassLimit =
      typeof query.topClassLimit === 'number' ? query.topClassLimit : 5;
    const range = buildDashboardRange(query.month, query.year);

    return this.dashboardCacheService.wrapJson({
      key: buildCacheKey('aggregate', {
        alertLimit,
        month: range.month,
        topClassLimit,
        year: range.year,
      }),
      cacheType: 'aggregate',
      loader: async () => {
        const [
          summaryCounts,
          monthlyTopupTotal,
          totalLearnedTuition,
          trendRows,
          prepaidTuitionTotal,
          expiringStudents,
          debtStudents,
          unpaidStaff,
          topClasses,
          quarterClassCounts,
        ] = await Promise.all([
          this.getSummaryCounts(),
          this.getMonthlyTopupTotal({
            monthStart: range.monthStart,
            monthEnd: range.monthEnd,
          }),
          this.getTotalLearnedTuition(),
          this.getMonthlyTrend({
            yearStart: range.yearStart,
            yearEnd: range.yearEnd,
          }),
          this.getPrepaidTuitionTotal(),
          this.getExpiringStudents(alertLimit),
          this.getDebtStudents(alertLimit),
          this.getUnpaidStaff(alertLimit),
          this.getTopClasses({
            monthStart: range.monthStart,
            monthEnd: range.monthEnd,
            limit: topClassLimit,
          }),
          this.getQuarterClassCounts({
            yearStart: range.yearStart,
            yearEnd: range.yearEnd,
          }),
        ]);

        const selectedMonthTrend = this.resolveSelectedMonthTrend(
          trendRows,
          range,
        );

        const expiringStudentsCount = normalizeInteger(
          expiringStudents[0]?.totalCount,
        );
        const debtStudentsCount = normalizeInteger(debtStudents[0]?.totalCount);
        const unpaidStaffCount = normalizeInteger(unpaidStaff[0]?.totalCount);
        const pendingCollectionTotal = normalizeMoneyAmount(
          debtStudents[0]?.totalAmount,
        );
        const pendingPayrollTotal = normalizeMoneyAmount(
          unpaidStaff[0]?.totalAmount,
        );

        const breakdown: AdminDashboardBreakdownItemDto[] = [
          {
            key: 'revenue',
            label: 'Học phí ghi nhận',
            kind: 'revenue',
            amount: selectedMonthTrend.revenue,
          },
          {
            key: 'teacherCost',
            label: 'Chi giảng dạy',
            kind: 'expense',
            amount: selectedMonthTrend.teacherCost,
          },
          {
            key: 'customerCareCost',
            label: 'Chi CSKH',
            kind: 'expense',
            amount: selectedMonthTrend.customerCareCost,
          },
          {
            key: 'lessonCost',
            label: 'Chi giáo án',
            kind: 'expense',
            amount: selectedMonthTrend.lessonCost,
          },
          {
            key: 'bonusCost',
            label: 'Bonus',
            kind: 'expense',
            amount: selectedMonthTrend.bonusCost,
          },
          {
            key: 'extraAllowanceCost',
            label: 'Trợ cấp khác',
            kind: 'expense',
            amount: selectedMonthTrend.extraAllowanceCost,
          },
          {
            key: 'operatingCost',
            label: 'Chi phí mở rộng',
            kind: 'expense',
            amount: selectedMonthTrend.operatingCost,
          },
        ];

        const revenueProfitTrend: AdminDashboardTrendPointDto[] = trendRows.map(
          (row) => ({
            monthKey: row.monthKey,
            month: row.monthLabel,
            revenue: row.revenue,
            expense: row.expense,
            profit: row.profit,
          }),
        );

        const actionAlerts: AdminDashboardActionAlertDto[] = [
          ...expiringStudents.map((row) => ({
            type: 'Sắp hết tiền' as const,
            subject: `${row.studentName} · ${row.classNames}`,
            owner: row.ownerName,
            due: formatStudentBalanceDue(row),
            amount: normalizeMoneyAmount(row.accountBalance),
            severity: 'warning' as const,
            targetType: 'student' as const,
            targetId: row.studentId,
          })),
          ...debtStudents.map((row) => ({
            type: 'Chưa thu' as const,
            subject: `${row.studentName} · ${row.classNames}`,
            owner: row.ownerName,
            due: formatDebtDue(row),
            amount: normalizeMoneyAmount(row.debtAmount),
            severity: 'destructive' as const,
            targetType: 'student' as const,
            targetId: row.studentId,
          })),
          ...unpaidStaff.map((row) => ({
            type: 'Nhân sự chưa thanh toán' as const,
            subject: `${row.staffName} · ${buildStaffUnpaidSourceLabel(row)}`,
            owner: 'Kế toán',
            due: `${
              [
                normalizeMoneyAmount(row.sessionAmount) > 0 ? 'buổi dạy' : null,
                normalizeMoneyAmount(row.bonusAmount) > 0 ? 'bonus' : null,
                normalizeMoneyAmount(row.customerCareAmount) > 0
                  ? 'CSKH'
                  : null,
                normalizeMoneyAmount(row.lessonAmount) > 0 ? 'giáo án' : null,
                normalizeMoneyAmount(row.extraAllowanceAmount) > 0
                  ? 'trợ cấp'
                  : null,
              ].filter(Boolean).length
            } nguồn pending`,
            amount: normalizeMoneyAmount(row.totalUnpaid),
            severity: 'info' as const,
            targetType: 'staff' as const,
            targetId: row.staffId,
          })),
          ...topClasses
            .filter((row) => normalizeMoneyAmount(row.balanceRisk) > 0)
            .slice(0, alertLimit)
            .map((row) => ({
              type: 'Lớp cảnh báo' as const,
              subject: row.name,
              owner: 'Vận hành',
              due: 'Có rủi ro công nợ',
              amount: normalizeMoneyAmount(row.balanceRisk),
              severity: 'warning' as const,
              targetType: 'class' as const,
              targetId: row.classId,
            })),
        ];

        const classPerformance: AdminDashboardClassPerformanceDto[] =
          topClasses.map((row) => ({
            classId: row.classId,
            name: row.name,
            students: normalizeInteger(row.students),
            revenue: normalizeMoneyAmount(row.revenue),
            profit: normalizeMoneyAmount(row.profit),
            balanceRisk: normalizeMoneyAmount(row.balanceRisk),
          }));

        const quarterClassCountMap = new Map<number, number>(
          quarterClassCounts.map((row) => [
            normalizeInteger(row.quarterNumber),
            normalizeInteger(row.classCount),
          ]),
        );

        const yearlySummary: AdminDashboardYearlySummaryDto[] = [
          1, 2, 3, 4,
        ].map((quarterNumber) => {
          const quarterRows = trendRows.filter((row) => {
            return (
              Math.floor(row.monthStart.getMonth() / 3) + 1 === quarterNumber
            );
          });

          return {
            quarter: `Q${quarterNumber}`,
            classes: quarterClassCountMap.get(quarterNumber) ?? 0,
            revenue: quarterRows.reduce((total, row) => total + row.revenue, 0),
            expense: quarterRows.reduce((total, row) => total + row.expense, 0),
            profit: quarterRows.reduce((total, row) => total + row.profit, 0),
          };
        });

        return {
          period: {
            month: range.month,
            year: range.year,
            monthLabel: formatMonthLabel(range.month, range.year),
          },
          summary: {
            activeClasses: normalizeInteger(summaryCounts.activeClasses),
            activeStudents: normalizeInteger(summaryCounts.activeStudents),
            monthlyTopupTotal,
            totalLearnedTuition,
            monthlyRevenue: selectedMonthTrend.revenue,
            monthlyExpense: selectedMonthTrend.expense,
            monthlyProfit: selectedMonthTrend.profit,
            prepaidTuitionTotal,
            pendingCollectionTotal,
            pendingPayrollTotal,
            expiringStudentsCount,
            debtStudentsCount,
            unpaidStaffCount,
            totalAlerts:
              expiringStudentsCount + debtStudentsCount + unpaidStaffCount,
          },
          revenueProfitTrend,
          breakdown,
          actionAlerts,
          classPerformance,
          yearlySummary,
        };
      },
    });
  }

  async getAdminFinancialDetail(
    query: GetAdminDashboardFinancialDetailQueryDto,
  ): Promise<AdminDashboardFinancialDetailDto> {
    const range = buildDashboardRange(query.month, query.year);
    const limit = typeof query.limit === 'number' ? query.limit : 500;
    const periodLabel = formatMonthLabel(range.month, range.year);

    return this.dashboardCacheService.wrapJson({
      key: buildCacheKey('financial-detail', {
        limit,
        month: range.month,
        rowKey: query.rowKey,
        year: range.year,
      }),
      cacheType: 'financial-detail',
      loader: async () => {
        switch (query.rowKey) {
          case 'topup': {
            const [amount, history] = await Promise.all([
              this.getMonthlyTopupTotal({
                monthStart: range.monthStart,
                monthEnd: range.monthEnd,
              }),
              this.getAdminTopupHistory({
                month: range.month,
                year: range.year,
                limit,
              }),
            ]);

            return {
              rowKey: query.rowKey,
              title: 'Chi tiết Tổng nạp',
              description: `Các giao dịch topup phát sinh trong ${periodLabel}.`,
              amount,
              sources: [
                {
                  key: 'topup-total',
                  label: `Topup trong ${periodLabel}`,
                  amount,
                  note: `Tổng tiền học sinh đã nạp trong kỳ đang xem.`,
                  tone: 'positive',
                },
              ],
              items: history.map<AdminDashboardFinancialDetailItemDto>(
                (item) => ({
                  id: item.id,
                  label: item.studentName,
                  secondaryLabel: formatDateTimeLabel(item.dateTime),
                  amount: item.amount,
                  note: `${formatCurrencyLabel(item.cumulativeBefore)} -> ${formatCurrencyLabel(item.cumulativeAfter)}${item.note ? ` • ${item.note}` : ''}`,
                }),
              ),
              emptyState: 'Chưa có giao dịch nạp trong kỳ này.',
            };
          }
          case 'revenue': {
            const [totalLearnedTuition, trendRows, classRows] =
              await Promise.all([
                this.getTotalLearnedTuition(),
                this.getMonthlyTrend({
                  yearStart: range.yearStart,
                  yearEnd: range.yearEnd,
                }),
                this.getLearnedTuitionByClass(limit),
              ]);
            const selectedMonthTrend = this.resolveSelectedMonthTrend(
              trendRows,
              range,
            );
            const yearlyRevenue = trendRows.reduce(
              (sum, row) => sum + row.revenue,
              0,
            );

            return {
              rowKey: query.rowKey,
              title: 'Chi tiết Học phí đã học',
              description:
                'Tổng học phí đã ghi nhận từ toàn bộ attendance present của tất cả học sinh.',
              amount: totalLearnedTuition,
              sources: [
                {
                  key: 'learned-total',
                  label: 'Lũy kế toàn hệ thống',
                  amount: totalLearnedTuition,
                  note: 'Tính từ tất cả buổi học có attendance present.',
                  tone: 'positive',
                },
                {
                  key: 'learned-month',
                  label: `Riêng ${periodLabel}`,
                  amount: selectedMonthTrend.revenue,
                  note: 'Học phí đã ghi nhận trong tháng đang xem.',
                  tone: 'neutral',
                },
                {
                  key: 'learned-year',
                  label: `Năm ${range.year}`,
                  amount: yearlyRevenue,
                  note: 'Tổng học phí đã ghi nhận trong năm đang xem.',
                  tone: 'neutral',
                },
              ],
              items: classRows.map<AdminDashboardFinancialDetailItemDto>(
                (row) => ({
                  id: row.classId,
                  label: row.className,
                  secondaryLabel: `${normalizeInteger(row.studentCount)} học sinh`,
                  amount: normalizeMoneyAmount(row.totalAmount),
                  note: `${normalizeInteger(row.attendanceCount)} lượt học present`,
                }),
              ),
              emptyState: 'Chưa có dữ liệu học phí đã học.',
            };
          }
          case 'prepaid': {
            const [amount, rows] = await Promise.all([
              this.getPrepaidTuitionTotal(),
              this.getAdminStudentBalanceDetails({ limit }),
            ]);

            return {
              rowKey: query.rowKey,
              title: 'Chi tiết Nợ học phí chưa dạy',
              description:
                'Số dư dương hiện tại của học sinh active thuộc lớp running.',
              amount,
              sources: [
                {
                  key: 'prepaid-total',
                  label: 'Số dư dương đang treo',
                  amount,
                  note: 'Chỉ tính học sinh active có ít nhất một lớp running.',
                  tone: 'positive',
                },
              ],
              items: rows.map<AdminDashboardFinancialDetailItemDto>((row) => ({
                id: row.studentId,
                label: row.studentName,
                secondaryLabel: row.className,
                amount: row.balance,
                note: 'Số dư hiện tại chưa phân bổ vào các buổi học tương lai.',
              })),
              emptyState: 'Chưa có dữ liệu số dư học sinh.',
            };
          }
          case 'uncollected': {
            const rows = await this.getDebtStudents(limit);
            const amount = normalizeMoneyAmount(rows[0]?.totalAmount);
            const totalCount = normalizeInteger(rows[0]?.totalCount);

            return {
              rowKey: query.rowKey,
              title: 'Chi tiết Chưa thu',
              description:
                'Các học sinh đang có số dư âm, cần theo dõi để thu thêm học phí.',
              amount,
              sources: [
                {
                  key: 'debt-total',
                  label: 'Tổng số dư âm hiện tại',
                  amount,
                  note: `${totalCount} học sinh đang âm ví.`,
                  tone: 'negative',
                },
              ],
              items: rows.map<AdminDashboardFinancialDetailItemDto>((row) => ({
                id: row.studentId,
                label: row.studentName,
                secondaryLabel: row.classNames,
                amount: normalizeMoneyAmount(row.debtAmount),
                note: row.ownerName
                  ? `CSKH phụ trách: ${row.ownerName}`
                  : 'Chưa gán CSKH phụ trách',
              })),
              emptyState: 'Chưa có học sinh nào nợ học phí.',
            };
          }
          case 'pending-payroll': {
            const rows = await this.getUnpaidStaff(limit);
            const amount = normalizeMoneyAmount(rows[0]?.totalAmount);
            const totalSessionAmount = normalizeMoneyAmount(
              rows[0]?.totalSessionAmount,
            );
            const totalBonusAmount = normalizeMoneyAmount(
              rows[0]?.totalBonusAmount,
            );
            const totalCustomerCareAmount = normalizeMoneyAmount(
              rows[0]?.totalCustomerCareAmount,
            );
            const totalLessonAmount = normalizeMoneyAmount(
              rows[0]?.totalLessonAmount,
            );
            const totalExtraAllowanceAmount = normalizeMoneyAmount(
              rows[0]?.totalExtraAllowanceAmount,
            );

            return {
              rowKey: query.rowKey,
              title: 'Chi tiết Chờ thanh toán trợ cấp',
              description:
                'Tổng các khoản pending cần chi trả cho nhân sự active trên hệ thống.',
              amount,
              sources: [
                {
                  key: 'pending-session',
                  label: 'Buổi dạy chưa thanh toán',
                  amount: totalSessionAmount,
                  note: 'Session teacher payment status = unpaid.',
                  tone: 'negative',
                },
                {
                  key: 'pending-customer-care',
                  label: 'CSKH chưa thanh toán',
                  amount: totalCustomerCareAmount,
                  note: 'Commission customer care còn pending.',
                  tone: 'negative',
                },
                {
                  key: 'pending-lesson',
                  label: 'Giáo án chưa thanh toán',
                  amount: totalLessonAmount,
                  note: 'Lesson output payment status = pending.',
                  tone: 'negative',
                },
                {
                  key: 'pending-bonus',
                  label: 'Bonus chưa thanh toán',
                  amount: totalBonusAmount,
                  note: 'Bonus đang ở trạng thái pending.',
                  tone: 'negative',
                },
                {
                  key: 'pending-extra',
                  label: 'Trợ cấp khác chưa thanh toán',
                  amount: totalExtraAllowanceAmount,
                  note: 'Extra allowance đang ở trạng thái pending.',
                  tone: 'negative',
                },
              ],
              items: rows.map<AdminDashboardFinancialDetailItemDto>((row) => {
                const segments = [
                  normalizeMoneyAmount(row.sessionAmount) > 0
                    ? `Buổi dạy ${formatCurrencyLabel(normalizeMoneyAmount(row.sessionAmount))}`
                    : null,
                  normalizeMoneyAmount(row.customerCareAmount) > 0
                    ? `CSKH ${formatCurrencyLabel(normalizeMoneyAmount(row.customerCareAmount))}`
                    : null,
                  normalizeMoneyAmount(row.lessonAmount) > 0
                    ? `Giáo án ${formatCurrencyLabel(normalizeMoneyAmount(row.lessonAmount))}`
                    : null,
                  normalizeMoneyAmount(row.bonusAmount) > 0
                    ? `Bonus ${formatCurrencyLabel(normalizeMoneyAmount(row.bonusAmount))}`
                    : null,
                  normalizeMoneyAmount(row.extraAllowanceAmount) > 0
                    ? `Trợ cấp ${formatCurrencyLabel(normalizeMoneyAmount(row.extraAllowanceAmount))}`
                    : null,
                ].filter((value): value is string => value != null);

                return {
                  id: row.staffId,
                  label: row.staffName,
                  secondaryLabel: buildStaffUnpaidSourceLabel(row),
                  amount: normalizeMoneyAmount(row.totalUnpaid),
                  note:
                    segments.length > 0
                      ? segments.join(' • ')
                      : 'Không có khoản pending chi tiết.',
                };
              }),
              emptyState: 'Không có khoản thanh toán pending cho nhân sự.',
            };
          }
          case 'personnel-cost':
          case 'other-cost':
          case 'profit':
          case 'total-in': {
            const [monthlyTopupTotal, trendRows] = await Promise.all([
              this.getMonthlyTopupTotal({
                monthStart: range.monthStart,
                monthEnd: range.monthEnd,
              }),
              this.getMonthlyTrend({
                yearStart: range.yearStart,
                yearEnd: range.yearEnd,
              }),
            ]);
            const selectedMonthTrend = this.resolveSelectedMonthTrend(
              trendRows,
              range,
            );
            const personnelCost =
              selectedMonthTrend.teacherCost +
              selectedMonthTrend.customerCareCost +
              selectedMonthTrend.lessonCost +
              selectedMonthTrend.bonusCost;
            const otherCost =
              selectedMonthTrend.operatingCost +
              selectedMonthTrend.extraAllowanceCost;

            if (query.rowKey === 'personnel-cost') {
              return {
                rowKey: query.rowKey,
                title: 'Chi tiết Chi phí nhân sự',
                description: `Các nguồn chi phí nhân sự ghi nhận trong ${periodLabel}.`,
                amount: personnelCost,
                sources: [
                  {
                    key: 'teacher-cost',
                    label: 'Chi giảng dạy',
                    amount: selectedMonthTrend.teacherCost,
                    note: 'Phụ cấp buổi dạy của giáo viên.',
                    tone: 'negative',
                  },
                  {
                    key: 'customer-care-cost',
                    label: 'Chi CSKH',
                    amount: selectedMonthTrend.customerCareCost,
                    note: 'Commission customer care theo attendance.',
                    tone: 'negative',
                  },
                  {
                    key: 'lesson-cost',
                    label: 'Chi giáo án',
                    amount: selectedMonthTrend.lessonCost,
                    note: 'Chi phí lesson output phát sinh trong tháng.',
                    tone: 'negative',
                  },
                  {
                    key: 'bonus-cost',
                    label: 'Bonus',
                    amount: selectedMonthTrend.bonusCost,
                    note: 'Các khoản thưởng đã ghi nhận trong tháng.',
                    tone: 'negative',
                  },
                ],
                items: [],
                emptyState:
                  'Không có thêm dòng chi tiết ngoài các nguồn chi phí trên.',
              };
            }

            if (query.rowKey === 'other-cost') {
              return {
                rowKey: query.rowKey,
                title: 'Chi tiết Chi phí khác',
                description: `Các nguồn chi phí vận hành khác ghi nhận trong ${periodLabel}.`,
                amount: otherCost,
                sources: [
                  {
                    key: 'operating-cost',
                    label: 'Chi phí mở rộng',
                    amount: selectedMonthTrend.operatingCost,
                    note: 'Các khoản cost_extend phát sinh trong tháng.',
                    tone: 'negative',
                  },
                  {
                    key: 'extra-allowance-cost',
                    label: 'Trợ cấp khác',
                    amount: selectedMonthTrend.extraAllowanceCost,
                    note: 'Các khoản extra allowance đã ghi nhận.',
                    tone: 'negative',
                  },
                ],
                items: [],
                emptyState:
                  'Không có thêm dòng chi tiết ngoài các nguồn chi phí trên.',
              };
            }

            if (query.rowKey === 'profit') {
              return {
                rowKey: query.rowKey,
                title: 'Chi tiết Lợi nhuận',
                description: `Lợi nhuận tháng được tính theo học phí đã học trừ toàn bộ chi phí ghi nhận trong ${periodLabel}.`,
                amount: selectedMonthTrend.profit,
                sources: [
                  {
                    key: 'profit-revenue',
                    label: 'Học phí đã học',
                    amount: selectedMonthTrend.revenue,
                    note: 'Nguồn cộng vào lợi nhuận.',
                    tone: 'positive',
                  },
                  {
                    key: 'profit-personnel',
                    label: 'Chi phí nhân sự',
                    amount: personnelCost,
                    note: 'Nguồn bị trừ khỏi lợi nhuận.',
                    tone: 'negative',
                  },
                  {
                    key: 'profit-other',
                    label: 'Chi phí khác',
                    amount: otherCost,
                    note: 'Nguồn bị trừ khỏi lợi nhuận.',
                    tone: 'negative',
                  },
                ],
                items: [],
                emptyState:
                  'Lợi nhuận của tháng này chỉ gồm các nguồn cộng trừ ở trên.',
              };
            }

            return {
              rowKey: query.rowKey,
              title: 'Chi tiết Tổng nhận',
              description: `Tổng nhận tháng được tính từ dòng tiền nạp trừ các khoản chi đã ghi nhận trong ${periodLabel}.`,
              amount: monthlyTopupTotal - personnelCost - otherCost,
              sources: [
                {
                  key: 'total-in-topup',
                  label: 'Tổng nạp',
                  amount: monthlyTopupTotal,
                  note: 'Nguồn tiền vào trong tháng đang xem.',
                  tone: 'positive',
                },
                {
                  key: 'total-in-personnel',
                  label: 'Chi phí nhân sự',
                  amount: personnelCost,
                  note: 'Khoản trừ ra khỏi tổng nhận.',
                  tone: 'negative',
                },
                {
                  key: 'total-in-other',
                  label: 'Chi phí khác',
                  amount: otherCost,
                  note: 'Khoản trừ ra khỏi tổng nhận.',
                  tone: 'negative',
                },
              ],
              items: [],
              emptyState:
                'Tổng nhận của tháng này chỉ gồm các nguồn cộng trừ ở trên.',
            };
          }
        }
      },
    });
  }

  async getAdminTopupHistory(
    query: GetAdminTopupHistoryQueryDto,
  ): Promise<AdminDashboardTopupHistoryItemDto[]> {
    const range = buildDashboardRange(query.month, query.year);
    const limit = typeof query.limit === 'number' ? query.limit : 120;

    return this.dashboardCacheService.wrapJson({
      key: buildCacheKey('topup-history', {
        limit,
        month: range.month,
        year: range.year,
      }),
      cacheType: 'topup-history',
      loader: async () => {
        const rows = await this.prisma.$queryRaw<
          TopupHistorySqlRow[]
        >(Prisma.sql`
          WITH topup_rows AS (
            SELECT
              wallet_transactions_history.id,
              wallet_transactions_history.created_at AS "dateTime",
              student_info.full_name AS "studentName",
              COALESCE(wallet_transactions_history.amount, 0) AS amount,
              wallet_transactions_history.note AS note,
              SUM(COALESCE(wallet_transactions_history.amount, 0)) OVER (
                ORDER BY
                  wallet_transactions_history.created_at ASC,
                  wallet_transactions_history.id ASC
              ) AS "cumulativeAfter"
            FROM wallet_transactions_history
            INNER JOIN student_info ON student_info.id = wallet_transactions_history.student_id
            WHERE wallet_transactions_history.type::text = 'topup'
          )
          SELECT
            id,
            "dateTime",
            "studentName",
            amount,
            note,
            "cumulativeAfter"
          FROM topup_rows
          WHERE "dateTime" >= ${range.monthStart}
            AND "dateTime" < ${range.monthEnd}
          ORDER BY "dateTime" DESC, id DESC
          LIMIT ${limit}
        `);

        return rows.map((row) => {
          const dateTime =
            row.dateTime instanceof Date
              ? row.dateTime.toISOString()
              : new Date(row.dateTime).toISOString();
          const amount = normalizeMoneyAmount(row.amount);
          const cumulativeAfter = normalizeMoneyAmount(row.cumulativeAfter);
          const cumulativeBefore = Math.max(0, cumulativeAfter - amount);

          return {
            id: row.id,
            dateTime,
            studentName: row.studentName,
            amount,
            note:
              row.note?.trim() ||
              `Nạp tiền: +${amount.toLocaleString('vi-VN')}đ`,
            cumulativeBefore,
            cumulativeAfter,
          };
        });
      },
    });
  }

  async getAdminStudentBalanceDetails(
    query: GetAdminStudentBalanceDetailsQueryDto,
  ): Promise<AdminDashboardStudentBalanceItemDto[]> {
    const limit = typeof query.limit === 'number' ? query.limit : 250;

    return this.dashboardCacheService.wrapJson({
      key: buildCacheKey('student-balance-details', { limit }),
      cacheType: 'student-balance-details',
      loader: async () => {
        const rows = await this.prisma.$queryRaw<
          StudentBalanceDetailSqlRow[]
        >(Prisma.sql`
          SELECT
            student_info.id AS "studentId",
            student_info.full_name AS "studentName",
            STRING_AGG(DISTINCT classes.name, ' - ' ORDER BY classes.name) AS "className",
            COALESCE(student_info.account_balance, 0) AS balance
          FROM student_info
          INNER JOIN student_classes ON student_classes.student_id = student_info.id
          INNER JOIN classes ON classes.id = student_classes.class_id
          WHERE student_info.status = 'active'
            AND classes.status = 'running'
            AND COALESCE(student_info.account_balance, 0) > 0
          GROUP BY
            student_info.id,
            student_info.full_name,
            student_info.account_balance
          ORDER BY
            COALESCE(student_info.account_balance, 0) DESC,
            student_info.full_name ASC
          LIMIT ${limit}
        `);

        return rows.map((row) => ({
          studentId: row.studentId,
          studentName: row.studentName,
          className: row.className,
          balance: normalizeMoneyAmount(row.balance),
        }));
      },
    });
  }
}
