import { api } from "../client";
import {
  ClassScheduleEntry,
  ClassScheduleEvent,
  ClassScheduleFilter,
  MakeupScheduleEventRecord,
  MakeupCalendarEventPayload,
  MakeupCalendarEventUpdatePayload,
} from "@/dtos/class-schedule.dto";

/**
 * Class Schedule API
 * Endpoints for managing class-based calendar scheduling
 */

type CalendarFeedResponse = {
  data?: unknown[];
  total?: number;
  meta?: { total?: number };
};

type RawCalendarEvent = Record<string, unknown>;
type RawMakeupScheduleEvent = Record<string, unknown>;

const coerceString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

const coerceStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};

const normalizeCalendarEvent = (raw: RawCalendarEvent): ClassScheduleEvent => {
  const teacherIds = coerceStringArray(raw.teacherIds);
  const teacherNames = coerceStringArray(raw.teacherNames);
  const students = Array.isArray(raw.students)
    ? raw.students
        .filter((student): student is Record<string, unknown> => typeof student === "object" && student !== null)
        .map((student) => ({
          id: coerceString(student.id),
          name:
            coerceString(student.name) ??
            coerceString(student.fullName) ??
            coerceString(student.studentName),
        }))
        .filter((student) => Boolean(student.id || student.name))
    : [];

  const studentIds = [
    ...coerceStringArray(raw.studentIds),
    ...students.map((student) => student.id).filter((value): value is string => Boolean(value)),
  ];
  const studentNames = [
    ...coerceStringArray(raw.studentNames),
    ...[coerceString(raw.studentName)].filter((value): value is string => Boolean(value)),
    ...students.map((student) => student.name).filter((value): value is string => Boolean(value)),
  ];

  const normalizedTitle =
    coerceString(raw.title) ??
    coerceString(raw.className) ??
    coerceString(raw.name) ??
    "Sự kiện lịch";

  const classIds = coerceStringArray(raw.classIds);
  const classNames = coerceStringArray(raw.classNames);
  const className =
    coerceString(raw.className) ??
    classNames[0] ??
    coerceString(raw.classTitle) ??
    normalizedTitle;

  const occurrenceId =
    coerceString(raw.occurrenceId) ??
    coerceString(raw.id) ??
    coerceString(raw.sourceEventId) ??
    [coerceString(raw.classId) ?? "event", coerceString(raw.date) ?? "date", normalizedTitle]
      .filter(Boolean)
      .join("-");

  return {
    occurrenceId,
    eventType:
      coerceString(raw.eventType) === "makeup" || coerceString(raw.type) === "makeup"
        ? "makeup"
        : coerceString(raw.eventType) === "exam" || coerceString(raw.type) === "exam"
          ? "exam"
          : "fixed",
    classId: coerceString(raw.classId) ?? classIds[0] ?? occurrenceId,
    classIds:
      classIds.length > 0
        ? classIds
        : coerceString(raw.classId)
          ? [coerceString(raw.classId) as string]
          : undefined,
    className,
    classNames:
      classNames.length > 0
        ? classNames
        : className
          ? [className]
          : undefined,
    title: normalizedTitle,
    teacherIds,
    teacherNames,
    studentId: coerceString(raw.studentId) ?? studentIds[0],
    studentIds,
    studentName: coerceString(raw.studentName) ?? studentNames[0],
    studentNames,
    date: coerceString(raw.date) ?? "",
    startTime: coerceString(raw.startTime),
    endTime: coerceString(raw.endTime),
    allDay:
      raw.allDay === true ||
      raw.isAllDay === true ||
      ((coerceString(raw.eventType) === "exam" || coerceString(raw.type) === "exam") &&
        !coerceString(raw.startTime) &&
        !coerceString(raw.endTime)),
    description: coerceString(raw.description),
    note: coerceString(raw.note),
    location: coerceString(raw.location),
    patternEntryId: coerceString(raw.patternEntryId),
    sourceEventId:
      coerceString(raw.sourceEventId) ??
      coerceString(raw.sourceId) ??
      coerceString(raw.id),
    meetLink: coerceString(raw.meetLink),
  };
};

export const normalizeMakeupScheduleEvent = (
  raw: RawMakeupScheduleEvent,
): MakeupScheduleEventRecord => ({
  id: coerceString(raw.id) ?? "",
  classId: coerceString(raw.classId) ?? "",
  teacherId: coerceString(raw.teacherId) ?? "",
  linkedSessionId: coerceString(raw.linkedSessionId) ?? null,
  date: coerceString(raw.date) ?? "",
  startTime: coerceString(raw.startTime),
  endTime: coerceString(raw.endTime),
  title: coerceString(raw.title),
  note: coerceString(raw.note),
  className:
    coerceString(raw.className) ??
    coerceString(raw.class_title) ??
    coerceString(raw.class_name),
  teacherName:
    coerceString(raw.teacherName) ??
    coerceString(raw.teacherFullName) ??
    coerceString(raw.teacher_name),
  googleMeetLink: coerceString(raw.googleMeetLink) ?? coerceString(raw.meetLink) ?? null,
  googleCalendarEventId: coerceString(raw.googleCalendarEventId) ?? null,
  calendarSyncedAt: coerceString(raw.calendarSyncedAt) ?? null,
  calendarSyncError: coerceString(raw.calendarSyncError) ?? null,
});

export const normalizeMakeupScheduleFeedResponse = (
  payload:
    | {
        data?: unknown[];
        total?: number;
      }
    | undefined,
): { data: MakeupScheduleEventRecord[]; total: number } => {
  const data = Array.isArray(payload?.data)
    ? payload.data
        .filter(
          (item): item is RawMakeupScheduleEvent =>
            typeof item === "object" && item !== null,
        )
        .map(normalizeMakeupScheduleEvent)
    : [];

  return {
    data,
    total: typeof payload?.total === "number" ? payload.total : data.length,
  };
};

const normalizeCalendarFeedResponse = (
  payload: CalendarFeedResponse | undefined,
): { data: ClassScheduleEvent[]; total: number } => {
  const data = Array.isArray(payload?.data)
    ? payload.data
        .filter((item): item is RawCalendarEvent => typeof item === "object" && item !== null)
        .map(normalizeCalendarEvent)
    : [];

  return {
    data,
    total:
      payload?.meta?.total ??
      payload?.total ??
      data.length,
  };
};

async function getAggregateCalendarEvents(
  params: ClassScheduleFilter,
): Promise<{ data: ClassScheduleEvent[]; total: number }> {
  try {
    const response = await api.get<CalendarFeedResponse>("/admin/calendar/events", {
      params,
    });
    return normalizeCalendarFeedResponse(response.data);
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status && status !== 404) {
      throw error;
    }
  }

  const response = await api.get<CalendarFeedResponse>("/admin/calendar/class-schedule", {
    params,
  });
  return normalizeCalendarFeedResponse(response.data);
}

/**
 * Fetch class schedule events within a date range with optional filters
 */
export async function getClassScheduleEvents(
  params: ClassScheduleFilter
): Promise<{ data: ClassScheduleEvent[]; total: number }> {
  return getAggregateCalendarEvents(params);
}

/**
 * Fetch the weekly schedule pattern for a specific class
 */
export async function getClassSchedulePattern(
  classId: string
): Promise<{ data: ClassScheduleEntry[] }> {
  const response = await api.get<{
    data: Array<{
      id?: string;
      dayOfWeek: number;
      from: string;
      end: string;
      teacherId?: string;
    }>;
  }>(
    `/admin/calendar/classes/${encodeURIComponent(classId)}/schedule`
  );
  return {
    data: response.data.data.map((entry) => ({
      id: entry.id,
      dayOfWeek: entry.dayOfWeek,
      from: entry.from,
      to: entry.end,
      teacherId: entry.teacherId,
    })),
  };
}

/**
 * Update the weekly schedule pattern for a specific class
 */
export async function updateClassSchedulePattern(
  classId: string,
  entries: ClassScheduleEntry[]
): Promise<{ data: ClassScheduleEntry[] }> {
  const response = await api.put<{
    data: Array<{
      id?: string;
      dayOfWeek: number;
      from: string;
      end: string;
      teacherId?: string;
    }>;
  }>(
    `/admin/calendar/classes/${encodeURIComponent(classId)}/schedule`,
    {
      schedule: entries.map((entry) => ({
        id: entry.id,
        dayOfWeek: entry.dayOfWeek,
        from: entry.from,
        end: entry.to,
        teacherId: entry.teacherId,
      })),
    }
  );
  return {
    data: response.data.data.map((entry) => ({
      id: entry.id,
      dayOfWeek: entry.dayOfWeek,
      from: entry.from,
      to: entry.end,
      teacherId: entry.teacherId,
    })),
  };
}

/**
 * Fetch all running classes for filter dropdown
 * Reuses existing class API endpoint
 */
export async function getClassesForFilter(params: {
  limit?: number;
  search?: string;
} = {}): Promise<{ data: Array<{ id: string; name: string }>; total: number }> {
  const { limit = 12, search } = params;
  const response = await api.get<{
    data: Array<{ id: string; name: string }>;
    total?: number;
  }>("/calendar/classes", {
    params: {
      limit,
      ...(search?.trim() ? { search: search.trim() } : {}),
    },
  });
  return {
    data: Array.isArray(response.data?.data) ? response.data.data : [],
    total:
      typeof response.data?.total === "number"
        ? response.data.total
        : Array.isArray(response.data?.data)
          ? response.data.data.length
          : 0,
  };
}

/**
 * Fetch all teachers (staff with teaching role) for filter dropdown
 * Reuses existing staff API endpoint
 */
export async function getTeachersForFilter(
  params: { limit?: number; search?: string } | number = {},
): Promise<{ data: Array<{ id: string; fullName: string }> }> {
  const normalizedParams =
    typeof params === "number" ? { limit: params } : params;
  const { limit = 100, search } = normalizedParams;
  const response = await api.get<{
    data: Array<{ id: string; name: string }>;
  }>("/calendar/teachers", {
    params: {
      limit,
      ...(search?.trim() ? { search: search.trim() } : {}),
    },
  });
  return {
    data: response.data.data.map((teacher) => ({
      id: teacher.id,
      fullName: teacher.name,
    })),
  };
}

export async function getStudentsForCalendarFilter(params: {
  limit?: number;
  search?: string;
} = {}): Promise<{ data: Array<{ id: string; fullName: string }>; total: number }> {
  const { limit = 12, search } = params;
  const response = await api.get<{
    data: Array<{ id: string; fullName: string }>;
    total?: number;
  }>("/calendar/students", {
    params: {
      limit,
      ...(search?.trim() ? { search: search.trim() } : {}),
    },
  });

  return {
    data: Array.isArray(response.data?.data) ? response.data.data : [],
    total:
      typeof response.data?.total === "number"
        ? response.data.total
        : Array.isArray(response.data?.data)
          ? response.data.data.length
          : 0,
  };
}

export async function createMakeupCalendarEvent(
  payload: MakeupCalendarEventPayload,
): Promise<ClassScheduleEvent> {
  const response = await api.post<{ data?: RawCalendarEvent }>(
    "/admin/calendar/makeup-events",
    payload,
  );
  return normalizeCalendarEvent((response.data?.data ?? response.data) as RawCalendarEvent);
}

export async function updateMakeupCalendarEvent(
  id: string,
  payload: MakeupCalendarEventUpdatePayload,
): Promise<ClassScheduleEvent> {
  const response = await api.patch<{ data?: RawCalendarEvent }>(
    `/admin/calendar/makeup-events/${encodeURIComponent(id)}`,
    payload,
  );
  return normalizeCalendarEvent((response.data?.data ?? response.data) as RawCalendarEvent);
}

export async function deleteMakeupCalendarEvent(id: string): Promise<void> {
  await api.delete(`/admin/calendar/makeup-events/${encodeURIComponent(id)}`);
}
