import { api } from "../client";
import {
  ClassScheduleEvent,
  ClassScheduleFilter,
} from "@/dtos/class-schedule.dto";

/**
 * Staff Calendar API
 * Endpoints for staff (teacher) to view their own teaching schedule
 */

type CalendarFeedResponse = {
  data?: unknown[];
  total?: number;
  meta?: { total?: number };
};

type RawCalendarEvent = Record<string, unknown>;

const coerceString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

const coerceStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};

const normalizeCalendarEvent = (raw: RawCalendarEvent): ClassScheduleEvent => ({
  occurrenceId:
    coerceString(raw.occurrenceId) ??
    coerceString(raw.id) ??
    [coerceString(raw.classId) ?? "event", coerceString(raw.date) ?? "date"].join("-"),
  eventType:
    coerceString(raw.eventType) === "makeup" || coerceString(raw.type) === "makeup"
      ? "makeup"
      : coerceString(raw.eventType) === "exam" || coerceString(raw.type) === "exam"
        ? "exam"
        : "fixed",
  classId:
    coerceString(raw.classId) ??
    coerceStringArray(raw.classIds)[0] ??
    coerceString(raw.occurrenceId) ??
    "event",
  classIds:
    coerceStringArray(raw.classIds).length > 0
      ? coerceStringArray(raw.classIds)
      : coerceString(raw.classId)
        ? [coerceString(raw.classId) as string]
        : undefined,
  className:
    coerceString(raw.className) ??
    coerceStringArray(raw.classNames)[0] ??
    coerceString(raw.title) ??
    "Sự kiện lịch",
  classNames:
    coerceStringArray(raw.classNames).length > 0
      ? coerceStringArray(raw.classNames)
      : coerceString(raw.className)
        ? [coerceString(raw.className) as string]
        : undefined,
  title: coerceString(raw.title) ?? coerceString(raw.className),
  teacherIds: coerceStringArray(raw.teacherIds),
  teacherNames: coerceStringArray(raw.teacherNames),
  studentId: coerceString(raw.studentId),
  studentIds: coerceStringArray(raw.studentIds),
  studentName: coerceString(raw.studentName),
  studentNames: [
    ...coerceStringArray(raw.studentNames),
    ...[coerceString(raw.studentName)].filter((value): value is string => Boolean(value)),
  ],
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
});

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

/**
 * Fetch staff calendar events within a date range with optional class filter
 */
export async function getStaffCalendarEvents(
  params: ClassScheduleFilter
): Promise<{ data: ClassScheduleEvent[]; total: number }> {
  const response = await api.get<CalendarFeedResponse>("/calendar/staff/events", { params });
  return normalizeCalendarFeedResponse(response.data);
}

/**
 * Fetch classes that the current staff member teaches (for filter dropdown)
 */
export async function getStaffClassesForFilter(params: {
  limit?: number;
  search?: string;
} = {}): Promise<{ data: Array<{ id: string; name: string }>; total: number }> {
  const { limit = 50, search } = params;
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
