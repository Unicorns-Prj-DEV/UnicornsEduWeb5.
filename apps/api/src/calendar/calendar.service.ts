import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/client';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import {
  ClassScheduleEntryDto,
  ClassScheduleEventDto,
  ClassScheduleFilterDto,
} from '../dtos/class-schedule.dto';
import { StaffRole } from 'generated/enums';
import { v4 as uuidv4 } from 'uuid';
import { getUserFullNameFromParts } from '../common/user-name.util';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface StoredClassScheduleEntry {
  id?: string;
  dayOfWeek?: number;
  from?: string;
  to?: string;
  end?: string;
  teacherId?: string;
  googleCalendarEventId?: string;
  meetLink?: string;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendarService: GoogleCalendarService,
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
          googleCalendarEventId:
            typeof entry.googleCalendarEventId === 'string'
              ? entry.googleCalendarEventId
              : undefined,
          meetLink:
            typeof entry.meetLink === 'string'
              ? entry.meetLink
              : undefined,
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
      googleCalendarEventId?: string;
      meetLink?: string;
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
      ...(entry.googleCalendarEventId
        ? { googleCalendarEventId: entry.googleCalendarEventId }
        : {}),
      ...(entry.meetLink ? { meetLink: entry.meetLink } : {}),
    })) as Prisma.InputJsonValue;
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

  private buildStaffDisplayName(staff: {
    user?: { first_name: string | null; last_name: string | null } | null;
  }) {
    return getUserFullNameFromParts(staff.user) ?? '';
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
      const fullName = this.buildStaffDisplayName(staff) || 'N/A';
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
    this.logger.log(`[Calendar CRUD:GET] getClassScheduleEvents: startDate=${startDate}, endDate=${endDate}, classId=${classId || '(all)'}, teacherId=${teacherId || '(all)'}`);

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
    this.logger.log(`[Calendar CRUD:GET] Found ${classes.length} classes matching filters`);

    const events: ClassScheduleEventDto[] = [];

    for (const cls of classes) {
      const rawSchedule = this.getStoredClassScheduleEntries(cls.schedule);
      this.logger.log(`[Calendar CRUD:GET] Class "${cls.name}" has ${rawSchedule.length} schedule entries`);
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
                    return this.buildStaffDisplayName(teacherRecord.teacher) || 'N/A';
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

    const enrichedEvents = await this.enrichEventsWithMeetLinks(events);

    return { success: true, data: enrichedEvents, total: enrichedEvents.length };
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
    this.logger.log(`[Calendar CRUD] === UPDATE CLASS SCHEDULE PATTERN START === classId=${classId}, entries=${entries.length}`);
    this.logger.log(`[Calendar CRUD] Incoming entries: ${JSON.stringify(entries, null, 2)}`);

    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!cls) {
      throw new NotFoundException(`Class not found: ${classId}`);
    }

    // Capture old schedule entries before update (to detect deletions)
    const oldSchedule = this.getStoredClassScheduleEntries(cls.schedule);
    this.logger.log(`[Calendar CRUD] Old schedule has ${oldSchedule.length} entries: ${JSON.stringify(oldSchedule.map(e => ({ id: e.id, googleCalendarEventId: e.googleCalendarEventId })))}`);

    // Assign UUIDs to new entries that don't have IDs yet
    const entriesWithIds = entries.map((entry) => {
      const newId = entry.id || uuidv4();
      if (!entry.id) {
        this.logger.log(`[Calendar CRUD] Assigned new UUID ${newId} to entry without id (dayOfWeek=${entry.dayOfWeek}, from=${entry.from})`);
      }
      return { ...entry, id: newId };
    });
    this.logger.log(`[Calendar CRUD] Entries with IDs: ${JSON.stringify(entriesWithIds.map(e => ({ id: e.id, dayOfWeek: e.dayOfWeek, from: e.from, end: e.end })))}`);

    // Save schedule WITHOUT eventId/meetLink (will be populated by sync)
    const storageEntries = this.serializeStoredClassScheduleEntries(
      entriesWithIds.map((entry) => ({
        id: entry.id,
        dayOfWeek: entry.dayOfWeek,
        from: entry.from,
        to: entry.end,
        teacherId: entry.teacherId,
      })),
    );
    this.logger.log(`[Calendar CRUD] Saving schedule to DB (without eventId/meetLink yet), entries: ${JSON.stringify(storageEntries)}`);

    await this.prisma.class.update({
      where: { id: classId },
      data: { schedule: storageEntries },
    });
    this.logger.log(`[Calendar CRUD] DB update complete for class ${classId}`);

    // Sync with Google Calendar after schedule change
    // Pass oldSchedule eventIds so sync can delete them before creating new ones
    this.logger.log(`[Calendar CRUD] Calling syncScheduleWithCalendar for class ${classId}...`);
    await this.syncScheduleWithCalendar(classId, oldSchedule);
    this.logger.log(`[Calendar CRUD] syncScheduleWithCalendar completed for class ${classId}`);

    return { success: true, data: entriesWithIds };
  }

  async syncScheduleWithCalendar(classId: string, oldSchedule?: StoredClassScheduleEntry[]): Promise<void> {
    this.logger.log(`[Calendar CRUD:sync] START syncScheduleWithCalendar for class ${classId}`);

    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        teachers: {
          include: {
            teacher: {
              include: {
                user: {
                  select: { email: true, first_name: true, last_name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!cls) {
      throw new NotFoundException(`Class not found: ${classId}`);
    }

    const currentSchedule = this.getStoredClassScheduleEntries(cls.schedule);
    this.logger.log(`[Calendar CRUD:sync] Class "${cls.name}" has ${currentSchedule.length} schedule entries in DB`);

    // Step 1: Delete ALL existing Google Calendar events from old schedule
    const entriesToDelete = oldSchedule || currentSchedule;
    this.logger.log(`[Calendar CRUD:sync] Deleting ${entriesToDelete.length} old calendar events...`);
    for (const entry of entriesToDelete) {
      const existingEventId = (entry as any).googleCalendarEventId;
      if (existingEventId) {
        this.logger.log(`[Calendar CRUD:sync] Deleting old event for entry ${entry.id}: eventId=${existingEventId}`);
        try {
          await this.googleCalendarService.deleteCalendarEvent(existingEventId);
          this.logger.log(`[Calendar CRUD:sync] Successfully deleted event ${existingEventId}`);
        } catch (err) {
          const stack = err instanceof Error ? err.stack : String(err);
          this.logger.error(`[Calendar CRUD:sync] Failed to delete event for entry ${entry.id}: ${stack}`);
        }
      }
    }

    // Clear old event IDs from schedule
    for (const entry of currentSchedule) {
      (entry as any).googleCalendarEventId = undefined;
      (entry as any).meetLink = undefined;
    }

    // Build a map of teacherId -> email and name
    const teacherEmailMap = new Map<string, string>();
    const teacherNameMap = new Map<string, string>();
    for (const teacherRecord of cls.teachers) {
      const teacher = teacherRecord.teacher;
      const email = teacher.user?.email;
      if (email) {
        teacherEmailMap.set(teacher.id, email);
      }
      const fullName = teacher.user
        ? `${teacher.user.last_name || ''} ${teacher.user.first_name || ''}`.trim()
        : '';
      if (fullName) {
        teacherNameMap.set(teacher.id, fullName);
      }
    }

    this.logger.log(`[Calendar CRUD:sync] Teacher map: emails=${JSON.stringify(Object.fromEntries(teacherEmailMap))}, names=${JSON.stringify(Object.fromEntries(teacherNameMap))}`);

    // Step 2: Create NEW Google Calendar events for all current schedule entries
    for (const entry of currentSchedule) {
      const dayOfWeek = entry.dayOfWeek;
      if (dayOfWeek === undefined) {
        this.logger.log(`[Calendar CRUD:sync] SKIP entry ${entry.id}: missing dayOfWeek`);
        continue;
      }
      const from = entry.from;
      const end = entry.to || entry.end;
      if (!from || !end) {
        this.logger.log(`[Calendar CRUD:sync] SKIP entry ${entry.id}: missing time (from=${from}, end=${end})`);
        continue;
      }

      const entryId = entry.id;
      if (!entryId) {
        this.logger.warn(`[Calendar CRUD:sync] SKIP entry: missing entryId`);
        continue;
      }

      // Collect teacher emails for this entry
      const teacherEmails: string[] = [];
      if (entry.teacherId) {
        const email = teacherEmailMap.get(entry.teacherId);
        if (email) teacherEmails.push(email);
      } else {
        for (const teacherRecord of cls.teachers) {
          const email = teacherRecord.teacher.user?.email;
          if (email) teacherEmails.push(email);
        }
      }

      this.logger.log(`[Calendar CRUD:sync] CREATE new event for entry ${entryId}: dayOfWeek=${dayOfWeek}, from=${from}, end=${end}, teacherEmails=[${teacherEmails}]`);

      try {
        const result = await this.googleCalendarService.createOrUpdateClassScheduleRecurringEvent({
          classId: cls.id,
          className: cls.name,
          entryId,
          calendarEventId: undefined, // Always create new event
          teacherEmails,
          dayOfWeek,
          from,
          end,
        });

        this.logger.log(`[Calendar CRUD:sync] Entry ${entryId} created OK: eventId=${result.eventId}, meetLink=${result.meetLink || '(none)'}`);

        // Update the schedule entry with the new eventId and meetLink
        (entry as any).googleCalendarEventId = result.eventId;
        (entry as any).meetLink = result.meetLink || undefined;
      } catch (err) {
        const stack = err instanceof Error ? err.stack : String(err);
        this.logger.error(`[Calendar CRUD:sync] FAIL entry ${entryId} for class ${classId}: ${stack}`);
      }
    }

    // Save updated schedule with eventId and meetLink
    this.logger.log(`[Calendar CRUD:sync] Saving updated schedule back to DB with eventId/meetLink...`);
    const updatedStorageEntries = this.serializeStoredClassScheduleEntries(
      currentSchedule.map((entry) => ({
        id: entry.id,
        dayOfWeek: entry.dayOfWeek,
        from: entry.from,
        to: entry.to || entry.end,
        teacherId: entry.teacherId,
        googleCalendarEventId: (entry as any).googleCalendarEventId,
        meetLink: (entry as any).meetLink,
      })),
    );
    this.logger.log(`[Calendar CRUD:sync] Data to save: ${JSON.stringify(updatedStorageEntries)}`);

    await this.prisma.class.update({
      where: { id: classId },
      data: { schedule: updatedStorageEntries },
    });
    this.logger.log(`[Calendar CRUD:sync] DB save complete for class ${classId}`);
  }

  private async enrichEventsWithMeetLinks(
    events: ClassScheduleEventDto[],
  ): Promise<ClassScheduleEventDto[]> {
    if (events.length === 0) return events;

    this.logger.log(`[Calendar] enrichEventsWithMeetLinks: enriching ${events.length} events`);

    const meetLinkMap = new Map<string, string>();

    // 1. Collect meetLinks from schedule entries (Class.schedule stores meetLink per entry)
    const uniqueClassIds = [...new Set(events.map((e) => e.classId))];
    this.logger.log(`[Calendar] enrichEventsWithMeetLinks: unique classIds = ${JSON.stringify(uniqueClassIds)}`);

    for (const classId of uniqueClassIds) {
      const cls = await this.prisma.class.findUnique({
        where: { id: classId },
        select: { schedule: true },
      });
      if (cls?.schedule && Array.isArray(cls.schedule)) {
        for (const rawEntry of cls.schedule) {
          const entry = rawEntry as Prisma.JsonObject;
          const entryId = typeof entry.id === 'string' ? entry.id : undefined;
          const entryMeetLink = typeof entry.meetLink === 'string' ? entry.meetLink : undefined;
          this.logger.log(`[Calendar] Schedule entry ${entryId}: meetLink=${entryMeetLink || '(none)'}`);
          if (entryId && entryMeetLink) {
            meetLinkMap.set(`${classId}::${entryId}`, entryMeetLink);
          }
        }
      } else {
        this.logger.log(`[Calendar] Class ${classId} has no schedule entries or schedule is not an array`);
      }
    }

    this.logger.log(`[Calendar] enrichEventsWithMeetLinks: meetLinkMap size = ${meetLinkMap.size}, keys = ${JSON.stringify([...meetLinkMap.keys()])}`);

    // Enrich events with meet links from the schedule pattern only.
    const enrichedEvents = events.map((event) => {
      if (event.patternEntryId) {
        const entryKey = `${event.classId}::${event.patternEntryId}`;
        const entryMeetLink = meetLinkMap.get(entryKey);
        if (entryMeetLink) {
          return { ...event, meetLink: entryMeetLink };
        }
      }
      return event;
    });

    const enrichedCount = enrichedEvents.filter((e) => e.meetLink).length;
    this.logger.log(`[Calendar] enrichEventsWithMeetLinks: ${enrichedCount}/${enrichedEvents.length} events enriched with meetLink`);

    return enrichedEvents;
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
              return this.buildStaffDisplayName(cls.teachers[0].teacher) || 'N/A';
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

    const enrichedEvents = await this.enrichEventsWithMeetLinks(events);

    return { success: true, data: enrichedEvents, total: enrichedEvents.length };
  }
}
