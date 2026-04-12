"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventClickArg,
  EventContentArg,
  EventMountArg,
} from "@fullcalendar/core";
import { ClassScheduleEvent } from "@/dtos/class-schedule.dto";
import styles from "./CalendarView.module.css";

interface CalendarViewProps {
  events: ClassScheduleEvent[];
  weekStart: Date;
  weekEnd: Date;
  onEventClick: (event: ClassScheduleEvent) => void;
}

type CalendarEventPalette = {
  start: string;
  end: string;
  text: string;
  shadow: string;
  ring: string;
  accent: string;
};

const CLASS_EVENT_PALETTES: CalendarEventPalette[] = [
  {
    start: "#0F766E",
    end: "#115E59",
    text: "#F8FAFC",
    shadow: "rgba(15, 118, 110, 0.26)",
    ring: "rgba(94, 234, 212, 0.82)",
    accent: "#99F6E4",
  },
  {
    start: "#2563EB",
    end: "#1D4ED8",
    text: "#F8FAFC",
    shadow: "rgba(37, 99, 235, 0.28)",
    ring: "rgba(147, 197, 253, 0.84)",
    accent: "#BFDBFE",
  },
  {
    start: "#7C3AED",
    end: "#6D28D9",
    text: "#F8FAFC",
    shadow: "rgba(124, 58, 237, 0.26)",
    ring: "rgba(196, 181, 253, 0.82)",
    accent: "#DDD6FE",
  },
  {
    start: "#DB2777",
    end: "#BE185D",
    text: "#FFF1F2",
    shadow: "rgba(219, 39, 119, 0.24)",
    ring: "rgba(251, 207, 232, 0.86)",
    accent: "#FBCFE8",
  },
  {
    start: "#EA580C",
    end: "#C2410C",
    text: "#FFF7ED",
    shadow: "rgba(234, 88, 12, 0.24)",
    ring: "rgba(254, 215, 170, 0.84)",
    accent: "#FED7AA",
  },
  {
    start: "#4D7C0F",
    end: "#3F6212",
    text: "#F7FEE7",
    shadow: "rgba(77, 124, 15, 0.24)",
    ring: "rgba(190, 242, 100, 0.82)",
    accent: "#D9F99D",
  },
  {
    start: "#4338CA",
    end: "#3730A3",
    text: "#EEF2FF",
    shadow: "rgba(67, 56, 202, 0.26)",
    ring: "rgba(199, 210, 254, 0.84)",
    accent: "#C7D2FE",
  },
  {
    start: "#0891B2",
    end: "#0E7490",
    text: "#ECFEFF",
    shadow: "rgba(8, 145, 178, 0.24)",
    ring: "rgba(165, 243, 252, 0.82)",
    accent: "#A5F3FC",
  },
];

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
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

const hashString = (value: string) => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
};

const getClassEventPalette = (classId: string) =>
  CLASS_EVENT_PALETTES[hashString(classId) % CLASS_EVENT_PALETTES.length];

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
  const calendarEvents = useMemo(
    () =>
      events.map((event) => {
        const palette = getClassEventPalette(event.classId);

        return {
          id: event.occurrenceId,
          title: event.className,
          start: `${event.date}T${event.startTime ?? "00:00:00"}`,
          end: `${event.date}T${event.endTime ?? event.startTime ?? "00:00:00"}`,
          backgroundColor: palette.start,
          borderColor: palette.ring,
          textColor: palette.text,
          extendedProps: {
            occurrenceId: event.occurrenceId,
            classId: event.classId,
            teacherIds: event.teacherIds,
            teacherNames: event.teacherNames,
            patternEntryId: event.patternEntryId,
            startTime: event.startTime,
            endTime: event.endTime,
            palette,
          },
        };
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

    return {
      slotMinTime: minutesToSlotTime(Math.floor((Math.max(minMinutes - 60, 0)) / 60) * 60),
      slotMaxTime: minutesToSlotTime(
        Math.ceil(Math.min(maxMinutes + 60, 24 * 60) / 60) * 60,
      ),
    };
  }, [events]);

  const renderEventContent = (eventInfo: EventContentArg) => {
    const { event } = eventInfo;

    return (
      <div className="flex min-h-full flex-col gap-1">
        <span className="truncate text-[11px] font-semibold">{eventInfo.timeText}</span>
        <span className="truncate text-xs font-semibold">{event.title}</span>
      </div>
    );
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const extendedProps = clickInfo.event.extendedProps as {
      occurrenceId: string;
      classId: string;
      teacherIds: string[];
      teacherNames: string[];
      startTime?: string;
      endTime?: string;
      patternEntryId?: string;
    };

    // Build our ClassScheduleEvent DTO
    const classScheduleEvent: ClassScheduleEvent = {
      occurrenceId: extendedProps.occurrenceId,
      classId: extendedProps.classId,
      teacherIds: extendedProps.teacherIds,
      className: clickInfo.event.title,
      teacherNames: extendedProps.teacherNames,
      date: clickInfo.event.start
        ? [
            clickInfo.event.start.getFullYear(),
            String(clickInfo.event.start.getMonth() + 1).padStart(2, "0"),
            String(clickInfo.event.start.getDate()).padStart(2, "0"),
          ].join("-")
        : "",
      startTime: extendedProps.startTime,
      endTime: extendedProps.endTime,
      patternEntryId: extendedProps.patternEntryId,
    };

    onEventClick(classScheduleEvent);
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
    <div className={`${styles.calendarShell} rounded-[1.5rem] border border-border-default bg-bg-surface p-2 text-sm shadow-sm sm:p-4`}>
      <div className="mb-3 flex items-center justify-between gap-3 px-1 sm:hidden">
        <div>
          <p className="text-sm font-semibold text-text-primary">Lịch tuần</p>
          <p className="text-xs text-text-muted">Vuốt ngang để xem đủ 7 ngày.</p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-border-default bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-text-secondary">
          <svg
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
          Scroll
        </div>
      </div>

      <div className="overflow-x-auto overscroll-x-contain pb-1">
        <div className={styles.calendarScroller}>
          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin]}
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
            allDaySlot={false}
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
            slotEventOverlap={true}
            expandRows={true}
            dayHeaderClassNames={["ue-day-header"]}
            viewClassNames={["ue-week-view"]}
          />
        </div>
      </div>
    </div>
  );
}
