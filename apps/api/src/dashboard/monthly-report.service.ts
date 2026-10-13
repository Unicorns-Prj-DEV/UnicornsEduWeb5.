import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/client';
import type {
  StudentCustomerSource,
  StudentDropOutReasonGroup,
  StudentStatus,
} from 'generated/enums';
import type {
  AdminMonthlyReportDto,
  GetAdminMonthlyReportQueryDto,
  MonthlyReportCustomerCareRowDto,
  MonthlyReportDropOutGroupCountDto,
  MonthlyReportDropOutGroupKey,
  MonthlyReportMatrixCellDto,
  MonthlyReportNewStudentDto,
} from '../dtos/dashboard.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  FIRST_WALLET_TOP_UP_SQL,
  QUALIFYING_TOP_UP_WHERE_SQL,
} from './first-wallet-top-up.sql';

/** Thứ tự hiển thị nhóm lý do nghỉ; `unclassified` luôn ở cuối. */
export const MONTHLY_REPORT_DROP_OUT_GROUP_ORDER: MonthlyReportDropOutGroupKey[] =
  [
    'busy_schedule',
    'no_suitable_class',
    'trial_only',
    'tuition',
    'exam_done',
    'changed_direction',
    'other',
    'unclassified',
  ];

export interface MonthlyReportStudentInput {
  id: string;
  fullName: string;
  status: StudentStatus;
  customerSource: StudentCustomerSource | null;
  dropOutDate: Date | null;
  dropOutReason: string | null;
  dropOutReasonGroup: StudentDropOutReasonGroup | null;
  customerCareStaffId: string | null;
}

export interface MonthlyReportTopUpInput {
  studentId: string;
  /** Nạp hợp lệ trong tháng báo cáo. */
  inMonthAmount: number;
  inMonthCount: number;
  /** Nạp hợp lệ từ lần nạp đầu tới hết tháng báo cáo. */
  toMonthEndAmount: number;
}

export interface MonthlyReportClassInput {
  studentId: string;
  className: string;
  courseId: string;
  courseName: string;
}

export interface MonthlyReportInput {
  month: string;
  year: string;
  monthStart: Date;
  monthEnd: Date;
  generatedAt: Date;
  students: MonthlyReportStudentInput[];
  /** studentId → lần nạp hợp lệ đầu tiên rơi vào tháng báo cáo. */
  firstTopUpInMonth: Map<string, Date>;
  topUps: MonthlyReportTopUpInput[];
  /** Lớp đầu tiên học sinh vào (cho học sinh mới). */
  firstClassByStudent: Map<string, MonthlyReportClassInput>;
  /** Lớp gần nhất học sinh vào (cho phụ lục học sinh nghỉ). */
  latestClassByStudent: Map<string, MonthlyReportClassInput>;
  staffNames: Map<string, string>;
}

const UNASSIGNED_STAFF_NAME = 'Chưa có CSKH';

function toDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function groupKeyOf(
  group: StudentDropOutReasonGroup | null,
): MonthlyReportDropOutGroupKey {
  return group ?? 'unclassified';
}

function countByGroup(
  students: MonthlyReportStudentInput[],
): MonthlyReportDropOutGroupCountDto[] {
  const counts = new Map<MonthlyReportDropOutGroupKey, number>();
  for (const student of students) {
    const key = groupKeyOf(student.dropOutReasonGroup);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return MONTHLY_REPORT_DROP_OUT_GROUP_ORDER.map((group) => ({
    group,
    count: counts.get(group) ?? 0,
  }));
}

/**
 * Tổng hợp **Báo cáo tháng** từ dữ liệu đã truy vấn. Hàm thuần, không đụng DB.
 *
 * - Học sinh mới: lần nạp hợp lệ đầu tiên rơi vào tháng (góc nhìn admin).
 * - Học sinh nghỉ: hiện đang nghỉ và `dropOutDate` trong tháng.
 * - Nghỉ sớm: học sinh mới của tháng mà hiện đang nghỉ.
 */
export function buildAdminMonthlyReport(
  input: MonthlyReportInput,
): AdminMonthlyReportDto {
  const topUpByStudent = new Map(
    input.topUps.map((row) => [row.studentId, row]),
  );
  const isInMonth = (value: Date | null) =>
    value != null && value >= input.monthStart && value < input.monthEnd;

  const newStudents = input.students.filter((student) =>
    input.firstTopUpInMonth.has(student.id),
  );
  const droppedStudents = input.students
    .filter(
      (student) =>
        student.status === 'inactive' && isInMonth(student.dropOutDate),
    )
    .sort(
      (a, b) =>
        (a.dropOutDate?.getTime() ?? 0) - (b.dropOutDate?.getTime() ?? 0) ||
        a.fullName.localeCompare(b.fullName, 'vi'),
    );
  const isEarlyDrop = (student: MonthlyReportStudentInput) =>
    student.status === 'inactive';
  const staffNameOf = (staffId: string | null) =>
    staffId ? (input.staffNames.get(staffId) ?? null) : null;

  // Ma trận Nguồn khách × Khoá học của lớp đầu tiên.
  const cells = new Map<string, MonthlyReportMatrixCellDto>();
  const courseNames = new Map<string, string>();
  for (const student of newStudents) {
    const firstClass = input.firstClassByStudent.get(student.id) ?? null;
    if (firstClass) courseNames.set(firstClass.courseId, firstClass.courseName);
    const courseId = firstClass?.courseId ?? null;
    const key = `${student.customerSource ?? ''}|${courseId ?? ''}`;
    const cell = cells.get(key) ?? {
      customerSource: student.customerSource,
      courseId,
      newCount: 0,
      earlyDropCount: 0,
      paidCount: 0,
      totalTopUp: 0,
    };
    const totalTopUp = topUpByStudent.get(student.id)?.toMonthEndAmount ?? 0;
    cell.newCount += 1;
    if (isEarlyDrop(student)) cell.earlyDropCount += 1;
    if (totalTopUp > 0) cell.paidCount += 1;
    cell.totalTopUp += totalTopUp;
    cells.set(key, cell);
  }

  // Bảng theo CSKH.
  const staffIds = new Set<string | null>();
  for (const student of input.students) {
    if (
      student.status === 'active' ||
      input.firstTopUpInMonth.has(student.id) ||
      droppedStudents.includes(student) ||
      (topUpByStudent.get(student.id)?.inMonthCount ?? 0) > 0
    ) {
      staffIds.add(student.customerCareStaffId);
    }
  }
  const customerCare: MonthlyReportCustomerCareRowDto[] = [...staffIds]
    .map((staffId) => {
      const owned = input.students.filter(
        (student) => student.customerCareStaffId === staffId,
      );
      const ownedNew = owned.filter((student) =>
        input.firstTopUpInMonth.has(student.id),
      );
      const ownedDropped = droppedStudents.filter(
        (student) => student.customerCareStaffId === staffId,
      );
      let totalTopUpInMonth = 0;
      let topUpTransactionCount = 0;
      for (const student of owned) {
        const topUp = topUpByStudent.get(student.id);
        totalTopUpInMonth += topUp?.inMonthAmount ?? 0;
        topUpTransactionCount += topUp?.inMonthCount ?? 0;
      }
      return {
        staffId,
        staffName: staffNameOf(staffId) ?? UNASSIGNED_STAFF_NAME,
        activeStudents: owned.filter((student) => student.status === 'active')
          .length,
        newStudents: ownedNew.length,
        droppedStudents: ownedDropped.length,
        netChange: ownedNew.length - ownedDropped.length,
        earlyDropCount: ownedNew.filter(isEarlyDrop).length,
        totalTopUpInMonth,
        topUpTransactionCount,
        droppedByGroup: countByGroup(ownedDropped),
      };
    })
    .sort(
      (a, b) =>
        Number(a.staffId == null) - Number(b.staffId == null) ||
        b.totalTopUpInMonth - a.totalTopUpInMonth ||
        a.staffName.localeCompare(b.staffName, 'vi'),
    );

  const newStudentRows: MonthlyReportNewStudentDto[] = newStudents
    .map((student) => {
      const firstClass = input.firstClassByStudent.get(student.id) ?? null;
      return {
        studentId: student.id,
        fullName: student.fullName,
        customerCareStaffName: staffNameOf(student.customerCareStaffId),
        className: firstClass?.className ?? null,
        courseId: firstClass?.courseId ?? null,
        courseName: firstClass?.courseName ?? null,
        customerSource: student.customerSource,
        firstTopUpAt: input.firstTopUpInMonth.get(student.id)!.toISOString(),
        totalTopUp: topUpByStudent.get(student.id)?.toMonthEndAmount ?? 0,
        isEarlyDrop: isEarlyDrop(student),
        dropOutDate:
          isEarlyDrop(student) && student.dropOutDate
            ? toDateKey(student.dropOutDate)
            : null,
        dropOutReasonGroup: isEarlyDrop(student)
          ? student.dropOutReasonGroup
          : null,
      };
    })
    .sort(
      (a, b) =>
        a.firstTopUpAt.localeCompare(b.firstTopUpAt) ||
        a.fullName.localeCompare(b.fullName, 'vi'),
    );

  let totalTopUpInMonth = 0;
  let topUpTransactionCount = 0;
  for (const row of input.topUps) {
    totalTopUpInMonth += row.inMonthAmount;
    topUpTransactionCount += row.inMonthCount;
  }
  const earlyDropCount = newStudents.filter(isEarlyDrop).length;

  return {
    month: input.month,
    year: input.year,
    generatedAt: input.generatedAt.toISOString(),
    kpi: {
      totalTopUpInMonth,
      topUpTransactionCount,
      activeStudents: input.students.filter(
        (student) => student.status === 'active',
      ).length,
      newStudents: newStudents.length,
      droppedStudents: droppedStudents.length,
      netChange: newStudents.length - droppedStudents.length,
      newStillActive: newStudents.length - earlyDropCount,
    },
    courses: [...courseNames.entries()]
      .map(([courseId, courseName]) => ({ courseId, courseName }))
      .sort((a, b) => a.courseName.localeCompare(b.courseName, 'vi')),
    matrix: [...cells.values()],
    droppedByGroup: countByGroup(droppedStudents),
    customerCare,
    newStudents: newStudentRows,
    droppedStudents: droppedStudents.map((student) => ({
      studentId: student.id,
      fullName: student.fullName,
      customerCareStaffName: staffNameOf(student.customerCareStaffId),
      className: input.latestClassByStudent.get(student.id)?.className ?? null,
      dropOutDate: toDateKey(student.dropOutDate!),
      dropOutReasonGroup: student.dropOutReasonGroup,
      dropOutReason: student.dropOutReason,
    })),
  };
}

type ClassSqlRow = {
  student_id: string;
  class_name: string;
  course_id: string;
  course_name: string;
};

@Injectable()
export class MonthlyReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminMonthlyReport(
    query: GetAdminMonthlyReportQueryDto,
  ): Promise<AdminMonthlyReportDto> {
    const year = Number(query.year);
    const month = Number(query.month);
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));

    const [students, firstTopUps, topUps, staffRows] = await Promise.all([
      this.prisma.studentInfo.findMany({
        select: {
          id: true,
          fullName: true,
          status: true,
          customerSource: true,
          dropOutDate: true,
          dropOutReason: true,
          dropOutReasonGroup: true,
          customerCareServices: { select: { staffId: true } },
        },
      }),
      this.prisma.$queryRaw<{ student_id: string; first_top_up_at: Date }[]>(
        Prisma.sql`
          SELECT student_id, first_top_up_at
          FROM (${FIRST_WALLET_TOP_UP_SQL}) AS first_wallet_top_up
          WHERE first_top_up_at >= ${monthStart}
            AND first_top_up_at < ${monthEnd}
        `,
      ),
      this.prisma.$queryRaw<
        {
          student_id: string;
          in_month_amount: bigint | number | null;
          in_month_count: bigint | number | null;
          to_month_end_amount: bigint | number | null;
        }[]
      >(Prisma.sql`
        SELECT
          wallet_transactions_history.student_id AS student_id,
          SUM(wallet_transactions_history.amount)
            FILTER (WHERE wallet_transactions_history.created_at >= ${monthStart})
            AS in_month_amount,
          COUNT(*)
            FILTER (WHERE wallet_transactions_history.created_at >= ${monthStart})
            AS in_month_count,
          SUM(wallet_transactions_history.amount) AS to_month_end_amount
        FROM wallet_transactions_history
        WHERE ${QUALIFYING_TOP_UP_WHERE_SQL}
          AND wallet_transactions_history.created_at < ${monthEnd}
        GROUP BY wallet_transactions_history.student_id
      `),
      this.prisma.$queryRaw<{ id: string; full_name: string | null }[]>(
        Prisma.sql`
          SELECT
            staff_info.id,
            NULLIF(
              TRIM(CONCAT(COALESCE(users.last_name, ''), ' ', COALESCE(users.first_name, ''))),
              ''
            ) AS full_name
          FROM staff_info
          INNER JOIN users ON users.id = staff_info.user_id
          WHERE EXISTS (
            SELECT 1 FROM customer_care_service
            WHERE customer_care_service.staff_id = staff_info.id
          )
        `,
      ),
    ]);

    const firstTopUpInMonth = new Map(
      firstTopUps.map((row) => [row.student_id, row.first_top_up_at]),
    );
    const droppedIds = students
      .filter(
        (student) =>
          student.status === 'inactive' &&
          student.dropOutDate != null &&
          student.dropOutDate >= monthStart &&
          student.dropOutDate < monthEnd,
      )
      .map((student) => student.id);

    const [firstClasses, latestClasses] = await Promise.all([
      this.findClassPerStudent([...firstTopUpInMonth.keys()], 'first'),
      this.findClassPerStudent(droppedIds, 'latest'),
    ]);

    return buildAdminMonthlyReport({
      month: query.month,
      year: query.year,
      monthStart,
      monthEnd,
      generatedAt: new Date(),
      students: students.map((student) => ({
        id: student.id,
        fullName: student.fullName,
        status: student.status,
        customerSource: student.customerSource,
        dropOutDate: student.dropOutDate,
        dropOutReason: student.dropOutReason,
        dropOutReasonGroup: student.dropOutReasonGroup,
        customerCareStaffId: student.customerCareServices?.staffId ?? null,
      })),
      firstTopUpInMonth,
      topUps: topUps.map((row) => ({
        studentId: row.student_id,
        inMonthAmount: Number(row.in_month_amount ?? 0),
        inMonthCount: Number(row.in_month_count ?? 0),
        toMonthEndAmount: Number(row.to_month_end_amount ?? 0),
      })),
      firstClassByStudent: firstClasses,
      latestClassByStudent: latestClasses,
      staffNames: new Map(
        staffRows.map((row) => [row.id, row.full_name ?? 'Nhân sự']),
      ),
    });
  }

  /** Lớp đầu tiên (hoặc gần nhất) học sinh vào, theo `student_classes.created_at`. */
  private async findClassPerStudent(
    studentIds: string[],
    pick: 'first' | 'latest',
  ): Promise<Map<string, MonthlyReportClassInput>> {
    if (studentIds.length === 0) return new Map();
    const order = pick === 'first' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const rows = await this.prisma.$queryRaw<ClassSqlRow[]>(Prisma.sql`
      SELECT DISTINCT ON (student_classes.student_id)
        student_classes.student_id AS student_id,
        classes.name AS class_name,
        courses.id AS course_id,
        courses.name AS course_name
      FROM student_classes
      INNER JOIN classes ON classes.id = student_classes.class_id
      INNER JOIN courses ON courses.id = classes.course_id
      WHERE student_classes.student_id IN (${Prisma.join(studentIds)})
      ORDER BY student_classes.student_id, student_classes.created_at ${order}
    `);
    return new Map(
      rows.map((row) => [
        row.student_id,
        {
          studentId: row.student_id,
          className: row.class_name,
          courseId: row.course_id,
          courseName: row.course_name,
        },
      ]),
    );
  }
}
