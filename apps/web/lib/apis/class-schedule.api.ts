import { api } from "../client";
import {
  ClassScheduleEntry,
  ClassScheduleEvent,
  ClassScheduleFilter,
} from "@/dtos/class-schedule.dto";

/**
 * Class Schedule API
 * Endpoints for managing class-based calendar scheduling
 */

/**
 * Fetch class schedule events within a date range with optional filters
 */
export async function getClassScheduleEvents(
  params: ClassScheduleFilter
): Promise<{ data: ClassScheduleEvent[]; total: number }> {
  const response = await api.get<{
    data: ClassScheduleEvent[];
    total?: number;
    meta?: { total: number };
  }>(
    "/admin/calendar/class-schedule",
    { params }
  );
  return {
    data: response.data.data,
    total: response.data.meta?.total ?? response.data.total ?? response.data.data.length,
  };
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
export async function getTeachersForFilter(limit: number = 100): Promise<{ data: Array<{ id: string; fullName: string }> }> {
  const response = await api.get<{
    data: Array<{ id: string; name: string }>;
  }>("/calendar/teachers", {
    params: { limit },
  });
  return {
    data: response.data.data.map((teacher) => ({
      id: teacher.id,
      fullName: teacher.name,
    })),
  };
}
