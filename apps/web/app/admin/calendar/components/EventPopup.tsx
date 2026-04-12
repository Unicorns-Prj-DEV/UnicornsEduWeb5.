"use client";

import { ClassScheduleEvent } from "@/dtos/class-schedule.dto";

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
                {event.className}
              </h3>
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
                {formatTime(event.startTime)} - {formatTime(event.endTime)}
              </p>
            </div>

            {/* Teacher */}
            {event.teacherNames.length > 0 && (
              <div className="rounded-lg border border-border-default bg-bg-secondary p-3">
                <p className="text-xs font-medium uppercase text-text-muted">Gia sư phụ trách</p>
                <p className="mt-1 text-sm text-text-primary">
                  {event.teacherNames.join(", ")}
                </p>
              </div>
            )}

            {/* Google Meet Link */}
            {event.meetLink ? (
              <a
                href={event.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-blue-400/40 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-500 transition-colors hover:bg-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
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
            ) : (
              <div className="rounded-lg border border-border-default bg-bg-secondary p-3 text-center">
                <p className="text-sm text-text-muted">
                  Chưa có link Google Meet cho buổi học này
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
