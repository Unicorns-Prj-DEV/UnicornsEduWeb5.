import { normalizeTimeOnly } from "@/lib/class.helpers";

type Props = {
  from?: string | null;
  to?: string | null;
  index: number;
};

export default function ScheduleTimeCard({ from, to, index }: Props) {
  const startTime = normalizeTimeOnly(from);
  const endTime = normalizeTimeOnly(to);

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <div className="rounded-lg border border-border-default bg-bg-tertiary px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Bắt đầu</p>
        <p className="mt-1 font-mono text-lg font-semibold text-text-primary">{startTime || "--:--:--"}</p>
      </div>

      <div className="flex items-center justify-center text-text-muted" aria-hidden>
        <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-4-4 4 4-4 4" />
        </svg>
      </div>

      <div className="rounded-lg border border-border-default bg-bg-tertiary px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Kết thúc</p>
        <p className="mt-1 font-mono text-lg font-semibold text-text-primary">{endTime || "--:--:--"}</p>
      </div>
    </div>
  );
}
