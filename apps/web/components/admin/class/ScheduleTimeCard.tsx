import {
  CLASS_SCHEDULE_DAY_LABELS,
  normalizeDayOfWeek,
  normalizeTimeOnly,
} from "@/lib/class.helpers";

type Props = {
  from?: string | null;
  to?: string | null;
  index: number;
  dayOfWeek?: number;
  teacherName?: string | null;
};

export default function ScheduleTimeCard({
  from,
  to,
  index,
  dayOfWeek,
  teacherName,
}: Props) {
  const startTime = normalizeTimeOnly(from);
  const endTime = normalizeTimeOnly(to);
  const slotLabel = String(index).padStart(2, "0");
  const compactStartTime = startTime ? startTime.slice(0, 5) : "--:--";
  const compactEndTime = endTime ? endTime.slice(0, 5) : "--:--";
  const normalizedDayOfWeek =
    dayOfWeek === undefined ? undefined : normalizeDayOfWeek(dayOfWeek);
  const dayLabel =
    normalizedDayOfWeek === undefined
      ? undefined
      : CLASS_SCHEDULE_DAY_LABELS[normalizedDayOfWeek];

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-secondary/70 px-3 py-2.5 sm:hidden">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border-default bg-bg-surface text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
          {slotLabel}
        </div>
        {dayLabel && (
          <span className="shrink-0 text-xs font-medium text-primary">
            {dayLabel}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-muted">
            Khung giờ học
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-text-primary">{compactStartTime}</span>
            <span className="text-text-muted" aria-hidden>
              →
            </span>
            <span className="font-mono text-sm font-semibold text-text-primary">{compactEndTime}</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            {teacherName?.trim() || "Chưa phân công gia sư"}
          </p>
        </div>
      </div>

      <div className="hidden rounded-xl border border-border-default bg-bg-secondary/60 p-3 sm:block">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-text-muted">
            {dayLabel ? (
              <>
                Khung giờ {dayLabel} {slotLabel}
              </>
            ) : (
              `Khung giờ ${slotLabel}`
            )}
          </p>
          <span className="rounded-full border border-border-default bg-bg-surface px-2 py-0.5 text-[11px] font-medium text-text-secondary">
            #{slotLabel}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="rounded-lg border border-border-default bg-bg-surface px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Bắt đầu</p>
            <p className="mt-1 font-mono text-lg font-semibold text-text-primary">{startTime || "--:--:--"}</p>
          </div>

          <div className="flex items-center justify-center text-text-muted" aria-hidden>
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-4-4 4 4-4 4" />
            </svg>
          </div>

          <div className="rounded-lg border border-border-default bg-bg-surface px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Kết thúc</p>
            <p className="mt-1 font-mono text-lg font-semibold text-text-primary">{endTime || "--:--:--"}</p>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-border-default bg-bg-surface px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">
            Gia sư chịu trách nhiệm
          </p>
          <p className="mt-1 text-sm font-medium text-text-primary">
            {teacherName?.trim() || "Chưa phân công gia sư"}
          </p>
        </div>
      </div>
    </>
  );
}
