import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/client';
import {
  type AdminDashboardActionAlertDto,
  type AdminDashboardBreakdownItemDto,
  type AdminDashboardClassPerformanceDto,
  type AdminDashboardDto,
  type AdminDashboardStudentBalanceItemDto,
  type AdminDashboardTopupHistoryItemDto,
  type AdminDashboardTrendPointDto,
  type AdminDashboardYearlySummaryDto,
  GetAdminDashboardQueryDto,
  GetAdminStudentBalanceDetailsQueryDto,
  GetAdminTopupHistoryQueryDto,
} from '../dtos/dashboard.dto';
import { DashboardCacheService } from '../cache/dashboard-cache.service';
import { PrismaService } from '../prisma/prisma.service';

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
  totalUnpaid: number | string | null;
  totalCount: number | string | null;
  totalAmount: number | string | null;
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
          WHERE status = 'running'
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
          AND attendance.status = 'present'
        GROUP BY 1
      ),
      session_allowances AS (
        SELECT
          date_trunc('month', sessions.date)::date AS month_start,
          sessions.id AS session_id,
          LEAST(
            COALESCE(
              classes.max_allowance_per_session,
              (
                (
                  COALESCE(sessions.allowance_amount, 0) *
                  COUNT(*) FILTER (WHERE attendance.status = 'present')
                ) +
                COALESCE(classes.scale_amount, 0)
              ) * COALESCE(sessions.coefficient, 1)
            ),
            (
              (
                COALESCE(sessions.allowance_amount, 0) *
                COUNT(*) FILTER (WHERE attendance.status = 'present')
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

  private async getExpiringStudents(limit: number) {
    return this.prisma.$queryRaw<StudentAlertSqlRow[]>(Prisma.sql`
      WITH student_financials AS (
        SELECT
          student_info.id AS "studentId",
          student_info.full_name AS "studentName",
          STRING_AGG(DISTINCT classes.name, ', ' ORDER BY classes.name) AS "classNames",
          staff_info.full_name AS "ownerName",
          COALESCE(student_info.account_balance, 0) AS "accountBalance",
          MAX(
            COALESCE(
              student_classes.custom_student_tuition_per_session,
              classes.student_tuition_per_session,
              CASE
                WHEN COALESCE(
                  student_classes.custom_tuition_package_session,
                  classes.tuition_package_session
                ) > 0
                  THEN ROUND(
                    COALESCE(
                      student_classes.custom_tuition_package_total,
                      classes.tuition_package_total
                    )::numeric /
                    COALESCE(
                      student_classes.custom_tuition_package_session,
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
        WHERE classes.status = 'running'
          AND student_info.status = 'active'
        GROUP BY
          student_info.id,
          student_info.full_name,
          student_info.account_balance,
          staff_info.full_name
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
          staff_info.full_name AS "ownerName",
          COALESCE(student_info.account_balance, 0) AS "accountBalance",
          MAX(
            COALESCE(
              student_classes.custom_student_tuition_per_session,
              classes.student_tuition_per_session,
              CASE
                WHEN COALESCE(
                  student_classes.custom_tuition_package_session,
                  classes.tuition_package_session
                ) > 0
                  THEN ROUND(
                    COALESCE(
                      student_classes.custom_tuition_package_total,
                      classes.tuition_package_total
                    )::numeric /
                    COALESCE(
                      student_classes.custom_tuition_package_session,
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
        WHERE classes.status = 'running'
          AND student_info.status = 'active'
        GROUP BY
          student_info.id,
          student_info.full_name,
          student_info.account_balance,
          staff_info.full_name
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
        SELECT id, full_name
        FROM staff_info
        WHERE status = 'active'
      ),
      session_allowances AS (
        SELECT
          sessions.teacher_id AS staff_id,
          sessions.id AS session_id,
          LEAST(
            COALESCE(
              classes.max_allowance_per_session,
              (
                (
                  COALESCE(sessions.allowance_amount, 0) *
                  COUNT(*) FILTER (WHERE attendance.status = 'present')
                ) +
                COALESCE(classes.scale_amount, 0)
              ) * COALESCE(sessions.coefficient, 1)
            ),
            (
              (
                COALESCE(sessions.allowance_amount, 0) *
                COUNT(*) FILTER (WHERE attendance.status = 'present')
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
      combined AS (
        SELECT
          active_staff.id AS "staffId",
          active_staff.full_name AS "staffName",
          COALESCE(session_unpaid.amount, 0) AS "sessionAmount",
          COALESCE(bonus_unpaid.amount, 0) AS "bonusAmount",
          COALESCE(customer_care_unpaid.amount, 0) AS "customerCareAmount",
          COALESCE(lesson_output_unpaid.amount, 0) AS "lessonAmount",
          COALESCE(extra_allowance_unpaid.amount, 0) AS "extraAllowanceAmount",
          (
            COALESCE(session_unpaid.amount, 0) +
            COALESCE(bonus_unpaid.amount, 0) +
            COALESCE(customer_care_unpaid.amount, 0) +
            COALESCE(lesson_output_unpaid.amount, 0) +
            COALESCE(extra_allowance_unpaid.amount, 0)
          ) AS "totalUnpaid"
        FROM active_staff
        LEFT JOIN session_unpaid ON session_unpaid.staff_id = active_staff.id
        LEFT JOIN bonus_unpaid ON bonus_unpaid.staff_id = active_staff.id
        LEFT JOIN customer_care_unpaid ON customer_care_unpaid.staff_id = active_staff.id
        LEFT JOIN lesson_output_unpaid ON lesson_output_unpaid.staff_id = active_staff.id
        LEFT JOIN extra_allowance_unpaid ON extra_allowance_unpaid.staff_id = active_staff.id
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
          COALESCE(SUM("totalUnpaid") OVER(), 0) AS "totalAmount"
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
        "totalUnpaid",
        "totalCount",
        "totalAmount"
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
          AND attendance.status = 'present'
        GROUP BY sessions.class_id
      ),
      class_allowances AS (
        SELECT
          sessions.class_id AS class_id,
          sessions.id AS session_id,
          LEAST(
            COALESCE(
              classes.max_allowance_per_session,
              (
                (
                  COALESCE(sessions.allowance_amount, 0) *
                  COUNT(*) FILTER (WHERE attendance.status = 'present')
                ) +
                COALESCE(classes.scale_amount, 0)
              ) * COALESCE(sessions.coefficient, 1)
            ),
            (
              (
                COALESCE(sessions.allowance_amount, 0) *
                COUNT(*) FILTER (WHERE attendance.status = 'present')
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

        const selectedMonthTrend =
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
          } satisfies MonthlyTrendNormalizedRow);

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
