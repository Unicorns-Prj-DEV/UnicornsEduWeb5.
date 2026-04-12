import { api } from "../client";
import {
  ClassScheduleEvent,
  ClassScheduleFilter,
} from "@/dtos/class-schedule.dto";

/**
 * Staff Calendar API
 * Endpoints for staff (teacher) to view their own teaching schedule
 */

/**
 * Fetch staff calendar events within a date range with optional class filter
 */
export async function getStaffCalendarEvents(
  params: ClassScheduleFilter
): Promise<{ data: ClassScheduleEvent[]; total: number }> {
  const response = await api.get<{
    data: ClassScheduleEvent[];
    total?: number;
    meta?: { total: number };
  }>("/calendar/staff/events", { params });
  return {
    data: response.data.data,
    total: response.data.meta?.total ?? response.data.total ?? response.data.data.length,
  };
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
