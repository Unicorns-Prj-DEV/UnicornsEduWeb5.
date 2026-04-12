"use client";

import { ClassScheduleEvent } from "@/dtos/class-schedule.dto";

interface EventPopupProps {
  event: ClassScheduleEvent;
  onClose: () => void;
}

/**
 * EventPopup component displays class details when a calendar event is clicked
 * Shows class name, date, time, and teacher information
 */
export default function EventPopup({ event, onClose }: EventPopupProps) {
  const formatTime = (time?: string) => {
    if (!time) return "—";
    return time.slice(0, 5);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
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
            {/* Date & Time */}
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-border-default bg-bg-secondary p-3">
                <p className="text-xs font-medium uppercase text-text-muted">Ngày</p>
                <p className="mt-1 text-sm text-text-primary">{formatDate(event.date)}</p>
              </div>
              <div className="rounded-lg border border-border-default bg-bg-secondary p-3">
                <p className="text-xs font-medium uppercase text-text-muted">Thời gian</p>
                <p className="mt-1 text-sm text-text-primary">
                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                </p>
              </div>
            </div>

            {/* Teachers */}
            {event.teacherNames.length > 0 && (
              <div className="rounded-lg border border-border-default bg-bg-secondary p-3">
                <p className="text-xs font-medium uppercase text-text-muted">Gia sư</p>
                <p className="mt-1 text-sm text-text-primary">
                  {event.teacherNames.join(", ")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
