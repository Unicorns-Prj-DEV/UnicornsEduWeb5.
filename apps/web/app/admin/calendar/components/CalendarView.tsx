"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";
import {
  EventClickArg,
  EventContentArg,
  EventMountArg,
} from "@fullcalendar/core";
import { ClassScheduleEvent } from "@/dtos/class-schedule.dto";
import {
  CalendarEventPalette,
  getCalendarEventPalette,
  getCalendarEventTypeLabel,
} from "./calendar-event-palette";
import styles from "./CalendarView.module.css";

interface CalendarViewProps {
  events: ClassScheduleEvent[];
  weekStart: Date;
  weekEnd: Date;
  onEventClick: (event: ClassScheduleEvent) => void;
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseTimeToMinutes = (value?: string) => {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

const minutesToSlotTime = (minutes: number) => {
  const clamped = Math.max(0, Math.min(minutes, 24 * 60));
  const hours = Math.floor(clamped / 60);
  const remainingMinutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}:00`;
};

const formatDisplayTime = (value?: string) => {
  if (!value) return "Cả ngày";
  return value.slice(0, 5);
};

/**
 * CalendarView component using FullCalendar
 * Displays the current week in a fixed Google Calendar-like time grid
 */
export default function CalendarView({
  events,
  weekStart,
  weekEnd,
  onEventClick,
}: CalendarViewProps) {
  const calendarKey = `${formatLocalDate(weekStart)}-${formatLocalDate(weekEnd)}`;
  const calendarEvents = useMemo(
    () =>
      events.map((event) => {
        const palette = getCalendarEventPalette(event);
        const title =
          event.eventType === "exam"
            ? event.title || event.className || "Lịch thi"
            : event.className;

        return {
          id: event.occurrenceId,
          title,
          start: event.allDay
            ? event.date
            : `${event.date}T${event.startTime ?? "00:00:00"}`,
          end: event.allDay
            ? formatLocalDate(addDays(new Date(`${event.date}T00:00:00`), 1))
            : `${event.date}T${event.endTime ?? event.startTime ?? "00:00:00"}`,
          allDay: event.allDay ?? false,
          backgroundColor: palette.start,
          borderColor: palette.ring,
          textColor: palette.text,
          classNames: [
            event.eventType === "makeup" ? "is-makeup" : "",
            event.eventType === "exam" ? "is-exam" : "",
            event.allDay ? "is-all-day" : "",
          ].filter(Boolean),
          extendedProps: {
            ...event,
            palette,
          },
        };
      }),
    [events],
  );
  const mobileAgendaEvents = useMemo(
    () =>
      events.toSorted((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return (a.startTime ?? "").localeCompare(b.startTime ?? "");
      }),
    [events],
  );

  const slotRange = useMemo(() => {
    const defaultRange = {
      slotMinTime: "06:00:00",
      slotMaxTime: "22:00:00",
    };

    if (events.length === 0) {
      return defaultRange;
    }

    const startTimes = events
      .map((event) => parseTimeToMinutes(event.startTime))
      .filter((value): value is number => value !== null);
    const endTimes = events
      .map((event) => parseTimeToMinutes(event.endTime))
      .filter((value): value is number => value !== null);

    if (startTimes.length === 0 || endTimes.length === 0) {
      return defaultRange;
    }

    const minMinutes = Math.min(...startTimes);
    const maxMinutes = Math.max(...endTimes);

    const padBefore = 45;
    const padAfter = 45;
    const dayStart = 6 * 60;
    const dayEnd = 22 * 60;

    let minSlot = Math.floor((Math.max(minMinutes - padBefore, 0)) / 60) * 60;
    let maxSlot = Math.ceil(Math.min(maxMinutes + padAfter, 24 * 60) / 60) * 60;

    // Bỏ dải nửa đêm–sáng trống khi mọi buổi đều từ 6h trở đi
    if (minMinutes >= dayStart) {
      minSlot = Math.max(minSlot, dayStart);
    }
    // Không kéo lưới quá 22:00 khi buổi học kết thúc không muộn hơn 22:00
    if (maxMinutes <= dayEnd) {
      maxSlot = Math.min(maxSlot, dayEnd);
    }

    minSlot = Math.max(0, minSlot);
    maxSlot = Math.min(24 * 60, maxSlot);

    if (maxSlot <= minSlot) {
      return defaultRange;
    }

    return {
      slotMinTime: minutesToSlotTime(minSlot),
      slotMaxTime: minutesToSlotTime(maxSlot),
    };
  }, [events]);

  const renderEventContent = (eventInfo: EventContentArg) => {
    const { event } = eventInfo;
    const sourceEvent = event.extendedProps as ClassScheduleEvent & {
      palette?: CalendarEventPalette;
    };
    const eventTypeLabel = getCalendarEventTypeLabel(sourceEvent.eventType ?? "fixed");
    const timeLabel = sourceEvent.allDay ? "Cả ngày" : eventInfo.timeText;
    const secondaryLabel =
      sourceEvent.eventType === "exam"
        ? sourceEvent.classNames?.length
          ? `Lớp: ${sourceEvent.classNames.join(", ")}`
          : null
        : sourceEvent.studentNames?.length
          ? sourceEvent.studentNames.join(", ")
          : null;

    return (
      <div className="flex min-h-full flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <span className="truncate text-[11px] font-semibold">{timeLabel}</span>
            <span className="shrink-0 rounded-full bg-bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
            {eventTypeLabel}
          </span>
        </div>
        <span className="truncate text-xs font-semibold">{event.title}</span>
        {secondaryLabel ? (
          <span className="truncate text-[11px] opacity-85">
            {secondaryLabel}
          </span>
        ) : null}
      </div>
    );
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    onEventClick(clickInfo.event.extendedProps as ClassScheduleEvent);
  };

  const handleEventDidMount = (mountInfo: EventMountArg) => {
    const { palette } = mountInfo.event.extendedProps as {
      palette?: CalendarEventPalette;
    };

    if (!palette) {
      return;
    }

    mountInfo.el.style.setProperty("--ue-calendar-event-start", palette.start);
    mountInfo.el.style.setProperty("--ue-calendar-event-end", palette.end);
    mountInfo.el.style.setProperty("--ue-calendar-event-text", palette.text);
    mountInfo.el.style.setProperty("--ue-calendar-event-shadow", palette.shadow);
    mountInfo.el.style.setProperty("--ue-calendar-event-ring", palette.ring);
    mountInfo.el.style.setProperty("--ue-calendar-event-accent", palette.accent);
  };

  return (
    <div className={`${styles.calendarShell} rounded-xl border border-border-default bg-bg-surface p-1.5 text-sm shadow-sm sm:p-2.5`}>
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5 lg:hidden">
        <div>
          <p className="text-xs font-semibold text-text-primary">Lịch tuần</p>
          <p className="text-[11px] text-text-muted">Agenda theo ngày, chạm để xem chi tiết.</p>
        </div>
        <div className="inline-flex items-center rounded-full border border-border-default bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-text-secondary">
          {mobileAgendaEvents.length} mục
        </div>
      </div>

      <div className="space-y-2 lg:hidden">
        {mobileAgendaEvents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-default bg-bg-secondary/70 px-3 py-8 text-center text-sm text-text-muted">
            Không có sự kiện trong tuần này.
          </div>
        ) : (
          mobileAgendaEvents.map((event) => {
            const palette = getCalendarEventPalette(event);
            const typeLabel = getCalendarEventTypeLabel(event.eventType);
            return (
              <button
                key={event.occurrenceId}
                type="button"
                onClick={() => onEventClick(event)}
                className="w-full rounded-lg border border-border-default bg-bg-secondary/70 p-3 text-left transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                style={{
                  borderColor: palette.ring,
                  background: `linear-gradient(90deg, ${palette.start}, ${palette.end})`,
                  color: palette.text,
                }}
              >
                <div className="flex flex-col gap-1 min-[380px]:flex-row min-[380px]:items-start min-[380px]:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold opacity-80">
                      {event.date} · {formatDisplayTime(event.startTime)}
                      {event.endTime ? `-${formatDisplayTime(event.endTime)}` : ""}
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold">
                      {event.title || event.className}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-bg-surface/80 px-2 py-0.5 text-[11px] font-semibold text-text-primary">
                    {typeLabel}
                  </span>
                </div>
                {event.teacherNames.length > 0 ? (
                  <p className="mt-2 break-words text-xs opacity-85">
                    GV: {event.teacherNames.join(", ")}
                  </p>
                ) : null}
              </button>
            );
          })
        )}
      </div>

      <div className="hidden overflow-x-auto overscroll-x-contain pb-1 lg:block">
        <div className={styles.calendarScroller}>
          <FullCalendar
            key={calendarKey}
            plugins={[timeGridPlugin, interactionPlugin, dayGridPlugin]}
            initialView="timeGridWeek"
            initialDate={weekStart}
            headerToolbar={false}
            visibleRange={{
              start: weekStart,
              end: addDays(weekEnd, 1),
            }}
            height="auto"
            events={calendarEvents}
            eventClick={handleEventClick}
            eventDidMount={handleEventDidMount}
            eventContent={renderEventContent}
            editable={false}
            selectable={false}
            navLinks={false}
            nowIndicator={true}
            businessHours={false}
            stickyHeaderDates="auto"
            firstDay={0}
            locale="vi"
            weekends={true}
            weekNumbers={false}
            allDaySlot={true}
            allDayText="Cả ngày"
            noEventsText="Không có sự kiện nào"
            dayHeaderFormat={{
              weekday: "short",
              day: "2-digit",
              month: "2-digit",
            }}
            eventTimeFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }}
            slotLabelFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }}
            displayEventTime={false}
            displayEventEnd={false}
            slotMinTime={slotRange.slotMinTime}
            slotMaxTime={slotRange.slotMaxTime}
            slotDuration="00:30:00"
            slotLabelInterval="01:00:00"
            slotEventOverlap={false}
            expandRows={true}
            dayHeaderClassNames={["ue-day-header"]}
            viewClassNames={["ue-week-view"]}
          />
        </div>
      </div>
    </div>
  );
}
