import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    attendance: Array<{ studentId: string }> | undefined,
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
  }

  async createSession(data: SessionCreateDto) {
    this.validateAttendanceItems(data.attendance, { required: true });

    const createdSession = await this.prisma.$transaction(async (tx) => {
      return tx.session.create({
        data: {
          classId: data.classId,
          teacherId: data.teacherId,
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
              data: data.attendance.map((attendanceItem) => ({
                studentId: attendanceItem.studentId,
                status: attendanceItem.status,
                notes: attendanceItem.notes ?? null,
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
        select: { id: true },
      });

      if (!existingSession) {
        throw new NotFoundException('Session not found');
      }

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
        },
      });

      if (data.attendance !== undefined) {
        const existingAttendance = await tx.attendance.findMany({
          where: { sessionId },
          select: { id: true, studentId: true },
        });

        const incomingStudentIds = new Set(
          data.attendance.map((attendanceItem) => attendanceItem.studentId),
        );

        const attendanceIdsToDelete = existingAttendance
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
              },
              update: {
                status: attendanceItem.status,
                notes: attendanceItem.notes ?? null,
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
    const existingSession = await this.prisma.session.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingSession) {
      throw new NotFoundException('Session not found');
    }

    return this.prisma.session.delete({
      where: { id },
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
