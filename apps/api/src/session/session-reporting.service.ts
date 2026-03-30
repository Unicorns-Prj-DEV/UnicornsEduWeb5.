import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/client';
import { UserRole } from '../../generated/enums';
import { SessionUnpaidSummaryItem } from '../dtos/session.dto';
import { PrismaService } from '../prisma/prisma.service';
import { StaffOperationsAccessService } from '../staff-ops/staff-operations-access.service';

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

  async getSessionsByClassId(classId: string, month: string, year: string) {
    return this.prisma.session.findMany({
      where: this.buildSessionsByClassWhere(classId, month, year),
      include: {
        teacher: true,
        attendance: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async getSessionsByClassIdForStaff(
    userId: string,
    roleType: UserRole,
    classId: string,
    month: string,
    year: string,
  ) {
    const actor = await this.staffOperationsAccess.resolveActor(
      userId,
      roleType,
    );

    if (actor.roles.length > 0) {
      await this.staffOperationsAccess.assertTeacherAssignedToClass(
        actor.id,
        classId,
      );
    }

    return this.prisma.session.findMany({
      where: this.buildSessionsByClassWhere(
        classId,
        month,
        year,
        actor.roles.length > 0 ? actor.id : undefined,
      ),
      include: {
        teacher: true,
        attendance: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async getSessionsByTeacherId(teacherId: string, month: string, year: string) {
    const range = this.buildMonthRange(month, year);

    return this.prisma.session.findMany({
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
              classes.max_allowance_per_session,
              COALESCE(sessions.coefficient, 1) * (
                COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (
                  WHERE attendance.status = 'present'
                ) + COALESCE(classes.scale_amount, 0)
              )
            ),
            COALESCE(sessions.coefficient, 1) * (
              COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (
                WHERE attendance.status = 'present'
              ) + COALESCE(classes.scale_amount, 0)
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
