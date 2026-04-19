"use client";

import { toast } from "sonner";
import { ClassScheduleEvent } from "@/dtos/class-schedule.dto";
import { getCalendarEventTypeLabel } from "./calendar-event-palette";

interface EventPopupProps {
  event: ClassScheduleEvent;
  onClose: () => void;
}

const DAY_NAMES = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

/**
 * EventPopup component displays class details when a calendar event is clicked
 * Shows day of week, time range, responsible teacher, and Google Meet link
 */
export default function EventPopup({ event, onClose }: EventPopupProps) {
  const meetLink = event.meetLink?.trim() ?? "";
  const eventTypeLabel = getCalendarEventTypeLabel(event.eventType);
  const headline = event.title?.trim() || event.className;
  const isExamEvent = event.eventType === "exam";
  const classSummary =
    event.classNames?.filter(Boolean).join(", ") || event.className || "";

  const formatTime = (time?: string) => {
    if (!time) return "—";
    return time.slice(0, 5);
  };

  const getDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return DAY_NAMES[date.getDay()] || "";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleCopyMeetLink = async () => {
    if (!meetLink) {
      toast.error("Chưa có link Google Meet.");
      return;
    }

    try {
      await navigator.clipboard.writeText(meetLink);
      toast.success("Đã sao chép link Google Meet.");
    } catch {
      toast.error("Không sao chép được link Google Meet.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Popup Content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-popup-title"
        className="relative z-10 flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] border border-border-default bg-bg-surface shadow-2xl sm:rounded-2xl"
      >
        <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-border-default sm:hidden" />

        <div className="overflow-y-auto p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h3
                id="event-popup-title"
                className="text-lg font-semibold text-text-primary line-clamp-2"
              >
                {headline}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {eventTypeLabel}
                </span>
                {event.allDay ? (
                  <span className="rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
                    Cả ngày
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-2 flex size-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus"
              aria-label="Đóng"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Event Details */}
          <div className="mt-4 space-y-3">
            {/* Day & Date */}
            <div className="rounded-lg border border-border-default bg-bg-secondary p-3">
              <p className="text-xs font-medium uppercase text-text-muted">Thứ</p>
              <p className="mt-1 text-sm font-medium text-text-primary">
                {getDayOfWeek(event.date)}
                <span className="ml-2 text-text-secondary">({formatDate(event.date)})</span>
              </p>
            </div>

            {/* Time */}
            <div className="rounded-lg border border-border-default bg-bg-secondary p-3">
              <p className="text-xs font-medium uppercase text-text-muted">Giờ</p>
              <p className="mt-1 text-sm text-text-primary">
                {event.allDay
                  ? isExamEvent
                    ? "Cả ngày (hiển thị như ngày lễ)"
                    : "Cả ngày"
                  : `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`}
              </p>
            </div>

            {classSummary ? (
              <div className="rounded-lg border border-border-default bg-bg-secondary p-3">
                <p className="text-xs font-medium uppercase text-text-muted">Lớp học</p>
                <p className="mt-1 text-sm text-text-primary">{classSummary}</p>
              </div>
            ) : null}

            {/* Teacher */}
            {event.teacherNames.length > 0 && !isExamEvent && (
              <div className="rounded-lg border border-border-default bg-bg-secondary p-3">
                <p className="text-xs font-medium uppercase text-text-muted">Gia sư phụ trách</p>
                <p className="mt-1 text-sm text-text-primary">
                  {event.teacherNames.join(", ")}
                </p>
              </div>
            )}

            {event.studentNames?.length ? (
              <div className="rounded-lg border border-border-default bg-bg-secondary p-3">
                <p className="text-xs font-medium uppercase text-text-muted">Học sinh</p>
                <p className="mt-1 text-sm text-text-primary">
                  {event.studentNames.join(", ")}
                </p>
              </div>
            ) : null}

            {event.note || event.description ? (
              <div className="rounded-lg border border-border-default bg-bg-secondary p-3">
                <p className="text-xs font-medium uppercase text-text-muted">Ghi chú</p>
                <p className="mt-1 text-sm text-text-primary">
                  {event.note ?? event.description}
                </p>
              </div>
            ) : null}

            {/* Google Meet Link */}
            {meetLink && !isExamEvent ? (
              <div className="flex items-stretch gap-2">
                <a
                  href={meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-blue-400/40 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-500 transition-colors hover:bg-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                >
                  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Vào Google Meet
                </a>
                <button
                  type="button"
                  onClick={() => void handleCopyMeetLink()}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border-default bg-bg-secondary text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus"
                  aria-label="Copy link Google Meet"
                  title="Copy link Google Meet"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="sr-only">Copy link Google Meet</span>
                </button>
              </div>
            ) : !isExamEvent ? (
              <div className="rounded-lg border border-border-default bg-bg-secondary p-3 text-center">
                <p className="text-sm text-text-muted">
                  Chưa có link Google Meet cho buổi học này
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
