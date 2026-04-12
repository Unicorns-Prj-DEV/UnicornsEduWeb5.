"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ACTION_HISTORY_INVALIDATION_EVENT } from "@/lib/client";
import * as staffCalendarApi from "@/lib/apis/staff-calendar.api";
import { ClassScheduleEvent, ClassScheduleFilter } from "@/dtos/class-schedule.dto";
import CalendarView from "@/app/admin/calendar/components/CalendarView";
import EventPopup from "@/app/admin/calendar/components/EventPopup";
import StaffCalendarFilterBar from "./components/StaffCalendarFilterBar";

type CalendarFilterState = Pick<ClassScheduleFilter, "classId">;

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

const formatWeekLabel = (start: Date, end: Date): string => {
  const formatter = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `Tuần hiện tại: CN ${formatter.format(start)} - T7 ${formatter.format(end)}`;
};

const getCurrentWeekRange = (today: Date = new Date()): CurrentWeekRange => {
  const anchor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay());

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start,
    end,
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
    label: formatWeekLabel(start, end),
  };
};

export default function StaffCalendarPage() {
  const queryClient = useQueryClient();
  const weekRange = useMemo(() => getCurrentWeekRange(), []);

  const [filters, setFilters] = useState<CalendarFilterState>({});
  const queryFilters = useMemo<ClassScheduleFilter>(
    () => ({
      ...filters,
      startDate: weekRange.startDate,
      endDate: weekRange.endDate,
    }),
    [filters, weekRange],
  );

  const [selectedEvent, setSelectedEvent] = useState<ClassScheduleEvent | null>(null);

  useEffect(() => {
    const handleInvalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["staffCalendarEvents"] });
    };

    window.addEventListener(
      ACTION_HISTORY_INVALIDATION_EVENT,
      handleInvalidate,
    );
    window.addEventListener("calendar:refetch", handleInvalidate);

    return () => {
      window.removeEventListener(
        ACTION_HISTORY_INVALIDATION_EVENT,
        handleInvalidate,
      );
      window.removeEventListener("calendar:refetch", handleInvalidate);
    };
  }, [queryClient]);

  const {
    data: eventsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{ data: ClassScheduleEvent[]; total: number }, Error>({
    queryKey: ["staffCalendarEvents", queryFilters],
    queryFn: () => staffCalendarApi.getStaffCalendarEvents(queryFilters),
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const events = eventsResponse?.data ?? [];

  useEffect(() => {
    if (isError && error) {
      toast.error(error.message || "Không thể tải lịch. Vui lòng thử lại sau.");
    }
  }, [isError, error]);

  const handleFiltersChange = useCallback((newFilters: CalendarFilterState) => {
    setFilters(newFilters);
  }, []);

  const handleEventClick = useCallback((event: ClassScheduleEvent) => {
    setSelectedEvent(event);
  }, []);

  const handleClosePopup = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-2 sm:p-4 lg:p-6">
      <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-border-default bg-bg-surface p-2.5 shadow-sm sm:p-4 lg:rounded-[1.75rem] lg:p-5">
        <section className="relative mb-3 overflow-visible rounded-[1.5rem] border border-border-default bg-gradient-to-br from-bg-secondary via-bg-surface to-bg-secondary/70 p-4 sm:mb-4 sm:p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/10 blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-10 left-10 size-28 rounded-full bg-warning/10 blur-2xl" aria-hidden />

          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">
                Lịch Dạy Cá Nhân
              </p>
              <h1 className="mt-2 text-xl font-semibold text-text-primary sm:text-2xl">
                Lịch Học
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-text-secondary">
                Hiển thị lịch học trong tuần hiện tại mà bạn phụ trách giảng dạy.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-3 sm:mb-4">
          <StaffCalendarFilterBar
            filters={filters}
            weekLabel={weekRange.label}
            onFiltersChange={handleFiltersChange}
          />
        </section>

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
                {queryFilters.classId
                  ? "Không có lịch học nào phù hợp với bộ lọc."
                  : "Chưa có lịch học nào trong tuần hiện tại."}
              </p>
            </div>
          ) : (
            <CalendarView
              events={events}
              onEventClick={handleEventClick}
              weekStart={weekRange.start}
              weekEnd={weekRange.end}
            />
          )}
        </section>
      </div>

      {selectedEvent && (
        <EventPopup
          event={selectedEvent}
          onClose={handleClosePopup}
        />
      )}
    </div>
  );
}
