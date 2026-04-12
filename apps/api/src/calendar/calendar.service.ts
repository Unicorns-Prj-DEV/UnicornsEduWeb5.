import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/client';
import {
  CalendarEventFilterDto,
  ResyncResponseDto,
} from '../dtos/google-calendar.dto';
import {
  ClassScheduleEntryDto,
  ClassScheduleEventDto,
  ClassScheduleFilterDto,
} from '../dtos/class-schedule.dto';
import { StaffRole } from 'generated/enums';

export interface CalendarEvent {
  sessionId: string;
  className: string;
  teacherName: string;
  date: string;
  startTime?: string;
  endTime?: string;
  meetLink?: string;
  calendarEventId?: string;
  syncedAt?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface SyncResult {
  sessionId: string;
  success: boolean;
  meetLink?: string;
  error?: string;
}

interface StoredClassScheduleEntry {
  id?: string;
  dayOfWeek?: number;
  from?: string;
  to?: string;
  end?: string;
  teacherId?: string;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private getStoredClassScheduleEntries(
    schedule: Prisma.JsonValue | null | undefined,
  ): StoredClassScheduleEntry[] {
    if (!Array.isArray(schedule)) {
      return [];
    }

    return schedule
      .filter(
        (entry) =>
          typeof entry === 'object' &&
          entry !== null &&
          !Array.isArray(entry),
      )
      .map((rawEntry) => {
        const entry = rawEntry as Prisma.JsonObject;

        return {
          id: typeof entry.id === 'string' ? entry.id : undefined,
          dayOfWeek:
            typeof entry.dayOfWeek === 'number' ? entry.dayOfWeek : undefined,
          from: typeof entry.from === 'string' ? entry.from : undefined,
          to: typeof entry.to === 'string' ? entry.to : undefined,
          end: typeof entry.end === 'string' ? entry.end : undefined,
          teacherId:
            typeof entry.teacherId === 'string' ? entry.teacherId : undefined,
        };
      });
  }

  private serializeStoredClassScheduleEntries(
    entries: Array<{
      id?: string;
      dayOfWeek?: number;
      from?: string;
      to?: string;
      teacherId?: string;
    }>,
  ): Prisma.InputJsonValue {
    return entries.map((entry) => ({
      ...(entry.id ? { id: entry.id } : {}),
      ...(typeof entry.dayOfWeek === 'number'
        ? { dayOfWeek: entry.dayOfWeek }
        : {}),
      ...(entry.from ? { from: entry.from } : {}),
      ...(entry.to ? { to: entry.to } : {}),
      ...(entry.teacherId ? { teacherId: entry.teacherId } : {}),
    })) as Prisma.InputJsonValue;
  }

  private formatTime(date: Date | null | undefined): string | undefined {
    if (!date) return undefined;
    return date.toTimeString().slice(0, 8);
  }

  private parseDateOnly(dateValue: string): Date {
    const [year, month, day] = dateValue.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }

  private formatDate(date: Date | null | undefined): string | undefined {
    if (!date) return undefined;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async mapSessionToCalendarEvent(
    session: {
      id: string;
      date: Date;
      startTime: Date | null;
      endTime: Date | null;
      googleMeetLink: string | null;
      googleCalendarEventId: string | null;
      calendarSyncedAt: Date | null;
      class: { name: string };
      teacher: {
        id: string;
        user?: { first_name: string | null; last_name: string | null } | null;
      } | null;
    },
  ): Promise<CalendarEvent> {
    const teacherName = session.teacher?.user
      ? `${session.teacher.user.last_name || ''} ${session.teacher.user.first_name || ''}`.trim() || 'N/A'
      : 'N/A';

    return {
      sessionId: session.id,
      className: session.class.name,
      teacherName,
      date: this.formatDate(session.date) || '',
      startTime: this.formatTime(session.startTime),
      endTime: this.formatTime(session.endTime),
      meetLink: session.googleMeetLink || undefined,
      calendarEventId: session.googleCalendarEventId || undefined,
      syncedAt: session.calendarSyncedAt?.toISOString() || undefined,
    };
  }

  async getAdminEvents(
    filters: CalendarEventFilterDto,
  ): Promise<PaginatedResponse<CalendarEvent>> {
    const { startDate, endDate, classId, teacherId } = filters;

    const startDt = this.parseDateOnly(startDate);
    startDt.setHours(0, 0, 0, 0);
    const endDt = this.parseDateOnly(endDate);
    endDt.setHours(23, 59, 59, 999);

    const where: Prisma.SessionWhereInput = {
      date: {
        gte: startDt,
        lte: endDt,
      },
      ...(classId && { classId }),
      ...(teacherId && { teacherId }),
    };

    const sessions = await this.prisma.session.findMany({
      where,
      include: {
        class: {
          select: { name: true },
        },
        teacher: {
          include: {
            user: {
              select: { first_name: true, last_name: true },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    const events = await Promise.all(
      sessions.map((session) => this.mapSessionToCalendarEvent(session)),
    );

    return {
      data: events,
      total: events.length,
      page: 1,
      limit: events.length,
    };
  }

  async getEventBySessionId(
    sessionId: string,
  ): Promise<CalendarEvent | null> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: {
          select: { name: true },
        },
        teacher: {
          include: {
            user: {
              select: { first_name: true, last_name: true },
            },
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    return this.mapSessionToCalendarEvent(session);
  }

  async updateSessionAndSync(
    sessionId: string,
    updates: Partial<{
      date: Date;
      startTime: Date | null;
      endTime: Date | null;
      notes: string | null;
      classId: string;
      teacherId: string;
    }>,
  ): Promise<CalendarEvent> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: {
          select: { name: true },
        },
        teacher: {
          include: {
            user: {
              select: { first_name: true, last_name: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    const updateData: Record<string, unknown> = {};
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.startTime !== undefined) updateData.startTime = updates.startTime;
    if (updates.endTime !== undefined) updateData.endTime = updates.endTime;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.classId !== undefined) updateData.classId = updates.classId;
    if (updates.teacherId !== undefined) updateData.teacherId = updates.teacherId;

    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        class: {
          select: { name: true },
        },
        teacher: {
          include: {
            user: {
              select: { first_name: true, last_name: true },
            },
          },
        },
      },
    });

    return this.mapSessionToCalendarEvent(updatedSession);
  }

  async deleteSessionAndCalendar(sessionId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    await this.prisma.session.delete({
      where: { id: sessionId },
    });
  }

  async syncEvent(sessionId: string): Promise<ResyncResponseDto> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, googleMeetLink: true },
    });

    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    return {
      success: true,
      meetLink: session.googleMeetLink || undefined,
    };
  }

  async bulkSync(
    sessionIds: string[],
  ): Promise<ResyncResponseDto[]> {
    if (sessionIds.length === 0) {
      return [];
    }

    const sessions = await this.prisma.session.findMany({
      where: { id: { in: sessionIds } },
      select: { id: true, googleMeetLink: true },
    });

    const foundSessions = new Map(sessions.map((s) => [s.id, s.googleMeetLink]));

    return sessionIds.map((id) => {
      const meetLink = foundSessions.get(id);
      if (meetLink !== undefined) {
        return {
          success: true,
          meetLink: meetLink || undefined,
        };
      }
      return {
        success: false,
        error: 'Session not found',
      };
    });
  }

  async getClasses(
    page: number = 1,
    limit: number = 50,
    search?: string,
  ): Promise<PaginatedResponse<{ id: string; name: string }>> {
    const trimmedSearch = search?.trim();
    const skip = (page - 1) * limit;
    const where: Prisma.ClassWhereInput = {
      status: 'running',
      ...(trimmedSearch
        ? {
            name: {
              contains: trimmedSearch,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [classes, total] = await Promise.all([
      this.prisma.class.findMany({
        where,
        select: { id: true, name: true },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.class.count({ where }),
    ]);

    return {
      data: classes,
      total,
      page,
      limit,
    };
  }

  async getTeachers(
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedResponse<{ id: string; name: string }>> {
    const skip = (page - 1) * limit;

    const [staffInfos, total] = await Promise.all([
      this.prisma.staffInfo.findMany({
        where: {
          status: 'active',
          classTeachers: {
            some: {
              class: {
                status: 'running',
              },
            },
          },
        },
        include: {
          user: {
            select: { first_name: true, last_name: true },
          },
        },
        skip,
        take: limit,
        orderBy: {
          user: {
            last_name: 'asc',
          },
        },
      }),
      this.prisma.staffInfo.count({
        where: {
          status: 'active',
          classTeachers: {
            some: {
              class: {
                status: 'running',
              },
            },
          },
        },
      }),
    ]);

    const teachers = staffInfos.map((staff) => {
      const fullName = staff.user
        ? `${staff.user.last_name || ''} ${staff.user.first_name || ''}`.trim()
        : 'N/A';
      return {
        id: staff.id,
        name: fullName,
      };
    });

    return {
      data: teachers,
      total,
      page,
      limit,
    };
  }

  private getNextDateForDay(date: Date, dayOfWeek: number): Date {
    const result = new Date(date);
    const currentDay = result.getDay();
    const diff = (dayOfWeek - currentDay + 7) % 7;
    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private getOccurrencesInRange(start: Date, end: Date, dayOfWeek: number): Date[] {
    const first = this.getNextDateForDay(start, dayOfWeek);
    if (first > end) {
      return [];
    }
    const occurrences: Date[] = [];
    let current = new Date(first);
    while (current <= end) {
      occurrences.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
    return occurrences;
  }

  async getClassScheduleEvents(
    filters: ClassScheduleFilterDto,
  ): Promise<{ success: boolean; data: ClassScheduleEventDto[]; total: number }> {
    const { startDate, endDate, classId, teacherId } = filters;

    const startDt = this.parseDateOnly(startDate);
    startDt.setHours(0, 0, 0, 0);
    const endDt = this.parseDateOnly(endDate);
    endDt.setHours(23, 59, 59, 999);

    const where: Prisma.ClassWhereInput = {};
    if (classId) {
      where.id = classId;
    }
    if (teacherId) {
      where.teachers = {
        some: {
          teacherId,
        },
      };
    }

    const classes = await this.prisma.class.findMany({
      where,
      include: {
        teachers: {
          include: {
            teacher: {
              include: {
                user: {
                  select: { first_name: true, last_name: true, email: true },
                },
              },
            },
          },
        },
      },
    });

    const events: ClassScheduleEventDto[] = [];

    for (const cls of classes) {
      const rawSchedule = this.getStoredClassScheduleEntries(cls.schedule);
      for (const entry of rawSchedule) {
        const dayOfWeek = entry.dayOfWeek;
        if (dayOfWeek === undefined) continue;
        const from = entry.from;
        const end = entry.to || entry.end;
        if (!from || !end) continue;

        const targetTeachers = entry.teacherId
          ? cls.teachers.filter(
              (teacherRecord) => teacherRecord.teacherId === entry.teacherId,
            )
          : teacherId
            ? cls.teachers.filter(
                (teacherRecord) => teacherRecord.teacherId === teacherId,
              )
            : cls.teachers;

        if (teacherId && entry.teacherId && entry.teacherId !== teacherId) {
          continue;
        }

        if (teacherId && targetTeachers.length === 0) continue;

        const teacherIds =
          targetTeachers.length > 0
            ? Array.from(
                new Set(
                  targetTeachers.map((teacherRecord) => teacherRecord.teacherId),
                ),
              )
            : entry.teacherId
              ? [entry.teacherId]
              : [];
        const teacherNames =
          targetTeachers.length > 0
            ? Array.from(
                new Set(
                  targetTeachers.map((teacherRecord) => {
                    const user = teacherRecord.teacher.user;
                    return user
                      ? `${user.last_name || ''} ${user.first_name || ''}`.trim() ||
                          'N/A'
                      : teacherRecord.teacher.fullName?.trim() || 'N/A';
                  }),
                ),
              )
            : teacherIds.length > 0
              ? ['N/A']
              : [];

        const occurrenceDates = this.getOccurrencesInRange(startDt, endDt, dayOfWeek);
        if (occurrenceDates.length === 0) continue;

        for (const occDate of occurrenceDates) {
          const dateStr = this.formatDate(occDate) || '';
          const entryId = entry.id || `${cls.id}-${dayOfWeek}-${from}-${dateStr}`;
          const occurrenceId = `${cls.id}-${entryId}-${dateStr}`;
          events.push({
            occurrenceId,
            classId: cls.id,
            className: cls.name,
            teacherIds,
            teacherNames,
            date: dateStr,
            startTime: from,
            endTime: end,
            patternEntryId: entry.id,
          });
        }
      }
    }

    events.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    return { success: true, data: events, total: events.length };
  }

  async getClassSchedulePattern(
    classId: string,
  ): Promise<{ success: boolean; data: ClassScheduleEntryDto[] }> {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { schedule: true },
    });
    if (!cls) {
      throw new NotFoundException(`Class not found: ${classId}`);
    }
    const entries: ClassScheduleEntryDto[] = this.getStoredClassScheduleEntries(
      cls.schedule,
    ).map((entry) => ({
      id: entry.id,
      dayOfWeek: entry.dayOfWeek ?? 0,
      from: entry.from ?? '',
      end: entry.to || entry.end || '',
      teacherId: entry.teacherId,
    }));
    return { success: true, data: entries };
  }

  async updateClassSchedulePattern(
    classId: string,
    entries: ClassScheduleEntryDto[],
  ): Promise<{ success: boolean; data: ClassScheduleEntryDto[] }> {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!cls) {
      throw new NotFoundException(`Class not found: ${classId}`);
    }

    const storageEntries = this.serializeStoredClassScheduleEntries(
      entries.map((entry) => ({
        id: entry.id,
        dayOfWeek: entry.dayOfWeek,
        from: entry.from,
        to: entry.end,
        teacherId: entry.teacherId,
      })),
    );

    await this.prisma.class.update({
      where: { id: classId },
      data: { schedule: storageEntries },
    });

    return { success: true, data: entries };
  }

  async getStaffScheduleEvents(
    staffId: string,
    filters: ClassScheduleFilterDto,
  ): Promise<{ success: boolean; data: ClassScheduleEventDto[]; total: number }> {
    const { startDate, endDate, classId } = filters;

    const startDt = this.parseDateOnly(startDate);
    startDt.setHours(0, 0, 0, 0);
    const endDt = this.parseDateOnly(endDate);
    endDt.setHours(23, 59, 59, 999);

    const where: Prisma.ClassWhereInput = {
      teachers: {
        some: {
          teacherId: staffId,
        },
      },
    };
    if (classId) {
      where.id = classId;
    }

    const classes = await this.prisma.class.findMany({
      where,
      include: {
        teachers: {
          where: {
            teacherId: staffId,
          },
          include: {
            teacher: {
              include: {
                user: {
                  select: { first_name: true, last_name: true, email: true },
                },
              },
            },
          },
        },
      },
    });

    const events: ClassScheduleEventDto[] = [];

    for (const cls of classes) {
      const rawSchedule = this.getStoredClassScheduleEntries(cls.schedule);
      for (const entry of rawSchedule) {
        const dayOfWeek = entry.dayOfWeek;
        if (dayOfWeek === undefined) continue;
        const from = entry.from;
        const end = entry.to || entry.end;
        if (!from || !end) continue;

        if (entry.teacherId && entry.teacherId !== staffId) {
          continue;
        }

        const occurrenceDates = this.getOccurrencesInRange(startDt, endDt, dayOfWeek);
        if (occurrenceDates.length === 0) continue;

        const teacherName = cls.teachers.length > 0
          ? (() => {
              const t = cls.teachers[0].teacher.user;
              return t
                ? `${t.last_name || ''} ${t.first_name || ''}`.trim() || 'N/A'
                : cls.teachers[0].teacher.fullName?.trim() || 'N/A';
            })()
          : 'N/A';

        for (const occDate of occurrenceDates) {
          const dateStr = this.formatDate(occDate) || '';
          const entryId = entry.id || `${cls.id}-${dayOfWeek}-${from}-${dateStr}`;
          const occurrenceId = `${cls.id}-${entryId}-${dateStr}`;
          events.push({
            occurrenceId,
            classId: cls.id,
            className: cls.name,
            teacherIds: [staffId],
            teacherNames: [teacherName],
            date: dateStr,
            startTime: from,
            endTime: end,
            patternEntryId: entry.id,
          });
        }
      }
    }

    events.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    return { success: true, data: events, total: events.length };
  }
}
