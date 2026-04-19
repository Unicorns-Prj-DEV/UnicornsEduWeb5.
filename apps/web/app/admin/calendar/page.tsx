"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ACTION_HISTORY_INVALIDATION_EVENT } from "@/lib/client";
import * as classScheduleApi from "@/lib/apis/class-schedule.api";
import {
  CalendarWeekVariant,
  ClassScheduleEvent,
  ClassScheduleFilter,
} from "@/dtos/class-schedule.dto";
import FilterBar from "./components/FilterBar";
import CalendarView from "./components/CalendarView";
import CalendarScheduleList from "./components/CalendarScheduleList";
import EventPopup from "./components/EventPopup";

type CalendarFilterState = {
  classIds: string[];
  teacherId?: string;
  studentId?: string;
};
type CalendarViewMode = "calendar" | "schedule";

type CurrentWeekRange = {
  start: Date;
  end: Date;
  startDate: string;
  endDate: string;
  label: string;
};

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatWeekLabel = (start: Date, end: Date, weekVariant: CalendarWeekVariant): string => {
  const formatter = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const prefix = weekVariant === "next" ? "Tuần sau" : "Tuần này";
  return `${prefix}: CN ${formatter.format(start)} - T7 ${formatter.format(end)}`;
};

const getWeekRange = (
  weekVariant: CalendarWeekVariant,
  today: Date = new Date(),
): CurrentWeekRange => {
  const anchor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay());
  if (weekVariant === "next") {
    start.setDate(start.getDate() + 7);
  }

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start,
    end,
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
    label: formatWeekLabel(start, end, weekVariant),
  };
};

/**
 * Admin Calendar Page
 * Displays the weekly class schedule with filtering by class and tutor
 * Reads recurring schedule occurrences from Class.schedule
 */
export default function AdminCalendarPage() {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<CalendarFilterState>({ classIds: [] });
  const [viewMode, setViewMode] = useState<CalendarViewMode>("calendar");
  const [weekVariant, setWeekVariant] = useState<CalendarWeekVariant>("current");
  const weekRange = useMemo(() => getWeekRange(weekVariant), [weekVariant]);
  const queryFilters = useMemo<ClassScheduleFilter>(
    () => ({
      startDate: weekRange.startDate,
      endDate: weekRange.endDate,
      ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
      ...(filters.studentId ? { studentId: filters.studentId } : {}),
    }),
    [filters.studentId, filters.teacherId, weekRange],
  );

  // Selected event for popup
  const [selectedEvent, setSelectedEvent] = useState<ClassScheduleEvent | null>(null);

  // Listen for resync events to refetch data
  useEffect(() => {
    const handleActionHistoryInvalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["classScheduleEvents"] });
    };

    window.addEventListener(
      ACTION_HISTORY_INVALIDATION_EVENT,
      handleActionHistoryInvalidate,
    );
    window.addEventListener("calendar:refetch", handleActionHistoryInvalidate);

    return () => {
      window.removeEventListener(
        ACTION_HISTORY_INVALIDATION_EVENT,
        handleActionHistoryInvalidate,
      );
      window.removeEventListener("calendar:refetch", handleActionHistoryInvalidate);
    };
  }, [queryClient]);

  // Fetch class schedule events
  const {
    data: eventsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{ data: ClassScheduleEvent[]; total: number }, Error>({
    queryKey: ["classScheduleEvents", queryFilters],
    queryFn: () => classScheduleApi.getClassScheduleEvents(queryFilters),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });

  const events = useMemo(() => eventsResponse?.data ?? [], [eventsResponse?.data]);
  const visibleEvents = useMemo(() => {
    let nextEvents = events;

    if (filters.classIds.length > 0) {
      const selected = new Set(filters.classIds);
      nextEvents = nextEvents.filter((event) =>
        event.classIds?.some((classId) => selected.has(classId)) ?? selected.has(event.classId),
      );
    }

    if (filters.studentId) {
      nextEvents = nextEvents.filter((event) =>
        event.studentId === filters.studentId ||
        event.studentIds?.includes(filters.studentId ?? ""),
      );
    }

    return nextEvents;
  }, [events, filters.classIds, filters.studentId]);

  // Error handling with Sonner toast
  useEffect(() => {
    if (isError && error) {
      toast.error(error.message || "Không thể tải lịch. Vui lòng thử lại sau.");
    }
  }, [isError, error]);

  // Handler for filter changes
  const handleFiltersChange = useCallback((newFilters: CalendarFilterState) => {
    setFilters(newFilters);
  }, []);

  // Handler for event click
  const handleEventClick = useCallback((event: ClassScheduleEvent) => {
    setSelectedEvent(event);
  }, []);

  // Handler to close popup
  const handleClosePopup = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-2 sm:p-3 lg:p-5">
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border-default bg-bg-surface p-2 shadow-sm sm:p-3 lg:rounded-2xl lg:p-4">
        {/* Header Section */}
        <section className="mb-2 rounded-lg border border-border-default bg-bg-secondary/40 px-3 py-2.5 sm:mb-3 sm:px-4 sm:py-3">
          <div className="flex flex-wrap items-end justify-between gap-2 gap-y-1">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/85">
                Weekly Calendar Board
              </p>
              <h1 className="mt-0.5 text-lg font-semibold leading-tight text-text-primary sm:text-xl">
                Lịch Dạy Và Lịch Thi
              </h1>
            </div>
            <p
              className="max-w-md text-right text-[11px] leading-snug text-text-muted sm:text-left sm:text-xs"
              title="Calendar: lưới theo giờ và hàng cả ngày. Schedule: danh sách theo ngày có lịch."
            >
              Calendar · lưới giờ + cả ngày · Schedule · theo ngày
            </p>
          </div>
        </section>

        {/* Filter Bar */}
        <section className="mb-2 sm:mb-3">
          <FilterBar
            filters={filters}
            viewMode={viewMode}
            weekVariant={weekVariant}
            weekLabel={weekRange.label}
            onFiltersChange={handleFiltersChange}
            onViewModeChange={setViewMode}
            onWeekVariantChange={setWeekVariant}
          />
        </section>

        {/* Calendar View */}
        <section className="min-w-0 flex-1 overflow-hidden px-0.5 py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="space-y-3 text-center">
                <div className="mx-auto size-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
                <p className="text-sm text-text-secondary">Đang tải lịch...</p>
              </div>
            </div>
          ) : isError ? (
            <div
              className="py-16 text-center text-error"
              role="alert"
              aria-live="assertive"
            >
              <p className="text-sm">
                {(error as { response?: { data?: { message?: string } } })?.response?.data
                  ?.message ??
                  (error as Error)?.message ??
                  "Không tải được dữ liệu lịch."}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-border-focus"
              >
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Thử lại
              </button>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted">
              <svg
                className="size-12 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm">
                {filters.teacherId
                  ? "Không có lịch học nào phù hợp với gia sư đã chọn."
                  : weekVariant === "next"
                    ? "Chưa có lịch học nào trong tuần sau."
                    : "Chưa có lịch học nào trong tuần này."}
              </p>
              <p className="text-xs">
                Thử thay đổi bộ lọc lớp học, gia sư hoặc học sinh.
              </p>
            </div>
          ) : visibleEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted">
              <svg
                className="size-12 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm">
                {filters.classIds.length > 0
                  ? "Không có lịch học nào phù hợp với các lớp đã chọn."
                  : filters.studentId
                    ? "Không có lịch học nào phù hợp với học sinh đã chọn."
                    : "Không có dữ liệu hiển thị."}
              </p>
            </div>
          ) : (
            <>
              {viewMode === "calendar" ? (
                <CalendarView
                  events={visibleEvents}
                  onEventClick={handleEventClick}
                  weekStart={weekRange.start}
                  weekEnd={weekRange.end}
                />
              ) : (
                <CalendarScheduleList
                  events={visibleEvents}
                  onEventClick={handleEventClick}
                  emptyStateTitle="Không có lịch học trong tuần này."
                  emptyStateDescription="Thử đổi bộ lọc lớp hoặc gia sư."
                />
              )}
            </>
          )}
        </section>
      </div>

      {/* Event Popup */}
      {selectedEvent && (
        <EventPopup
          event={selectedEvent}
          onClose={handleClosePopup}
        />
      )}
    </div>
  );
}
