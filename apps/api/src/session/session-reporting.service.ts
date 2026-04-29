import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/client';
import { UserRole } from '../../generated/enums';
import { SessionUnpaidSummaryItem } from '../dtos/session.dto';
import { PrismaService } from '../prisma/prisma.service';
import { StaffOperationsAccessService } from '../staff-ops/staff-operations-access.service';
import { getUserFullNameFromParts } from '../common/user-name.util';

@Injectable()
export class SessionReportingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffOperationsAccess: StaffOperationsAccessService,
  ) {}

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

  private buildSessionsByClassWhere(
    classId: string,
    month: string,
    year: string,
    teacherId?: string,
  ): Prisma.SessionWhereInput {
    const range = this.buildMonthRange(month, year);

    return {
      classId,
      ...(teacherId ? { teacherId } : {}),
      date: {
        gte: range.start,
        lt: range.end,
      },
    };
  }

  private readonly attendanceInclude = {
    include: {
      student: {
        select: { id: true, fullName: true },
      },
    },
  } as const;

  private withDerivedTeacherFullName<
    T extends {
      teacher:
        | {
            id: string;
            user: { first_name: string | null; last_name: string | null } | null;
          }
        | null;
    },
  >(session: T) {
    return {
      ...session,
      teacher: session.teacher
        ? {
            ...session.teacher,
            fullName: getUserFullNameFromParts(session.teacher.user) ?? '',
          }
        : null,
    };
  }

  async getSessionsByClassId(classId: string, month: string, year: string) {
    const sessions = await this.prisma.session.findMany({
      where: this.buildSessionsByClassWhere(classId, month, year),
      include: {
        teacher: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
        attendance: this.attendanceInclude,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return sessions.map((session) => this.withDerivedTeacherFullName(session));
  }

  async getSessionsByClassIdForStaff(
    userId: string,
    roleType: UserRole,
    classId: string,
    month: string,
    year: string,
  ) {
    const actor = await this.staffOperationsAccess.resolveClassViewerActor(
      userId,
      roleType,
    );
    const accessMode =
      await this.staffOperationsAccess.resolveClassViewAccessMode(
        actor,
        classId,
      );

    const sessions = await this.prisma.session.findMany({
      where: this.buildSessionsByClassWhere(
        classId,
        month,
        year,
        accessMode === 'teacher' ? actor.id : undefined,
      ),
      include: {
        teacher: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
        attendance: this.attendanceInclude,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return sessions.map((session) => this.withDerivedTeacherFullName(session));
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
        attendance: this.attendanceInclude,
        teacher: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return sessions.map((session) => this.withDerivedTeacherFullName(session));
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
          COALESCE(sessions.allowance_amount, 0) AS allowance_amount,
          COALESCE(classes.scale_amount, 0) AS scale_amount,
          LEAST(
            COALESCE(
              NULLIF(classes.max_allowance_per_session, 0),
              COALESCE(sessions.coefficient, 1) * (
                COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (
                  WHERE attendance.status IN ('present', 'excused')
                ) + COALESCE(classes.scale_amount, 0)
              )
            ),
            COALESCE(sessions.coefficient, 1) * (
              COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (
              WHERE attendance.status IN ('present', 'excused')
            ) + COALESCE(classes.scale_amount, 0)
            )
          ) -
          ROUND(
            (
              LEAST(
                COALESCE(
                  NULLIF(classes.max_allowance_per_session, 0),
                  COALESCE(sessions.coefficient, 1) * (
                    COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (
                      WHERE attendance.status IN ('present', 'excused')
                    ) + COALESCE(classes.scale_amount, 0)
                  )
                ),
                COALESCE(sessions.coefficient, 1) * (
                  COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (
                    WHERE attendance.status IN ('present', 'excused')
                  ) + COALESCE(classes.scale_amount, 0)
                )
              ) * COALESCE(sessions.teacher_tax_rate_percent, 0)
            ) / 100.0,
            0
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
