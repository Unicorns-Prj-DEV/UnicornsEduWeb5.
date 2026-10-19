"use client";

export type KpiDelta = { text: string; tone: "up" | "down" | "flat" };

const DELTA_CLASS: Record<KpiDelta["tone"], string> = {
  up: "bg-success/12 text-success",
  down: "bg-error/12 text-error",
  flat: "bg-bg-secondary text-text-secondary",
};

/** % thay đổi so với kỳ trước; `invert` cho chỉ số "tăng là xấu" (chi phí). */
export function computeDelta(current: number, previous: number | undefined, invert = false): KpiDelta | null {
  if (previous == null || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(pct * 10) / 10;
  if (rounded === 0) return { text: "0%", tone: "flat" };
  const good = invert ? rounded < 0 : rounded > 0;
  return {
    text: `${rounded > 0 ? "▲" : "▼"} ${Math.abs(rounded).toLocaleString("vi-VN")}%`,
    tone: good ? "up" : "down",
  };
}

/** Chênh lệch số lượng (học sinh): "▲ 12" / "▼ 11". */
export function computeCountDelta(change: number | null | undefined): KpiDelta | null {
  if (change == null) return null;
  if (change === 0) return { text: "= 0", tone: "flat" };
  return {
    text: `${change > 0 ? "▲" : "▼"} ${Math.abs(change).toLocaleString("vi-VN")}`,
    tone: change > 0 ? "up" : "down",
  };
}

export function KpiStatCard({
  label,
  value,
  delta,
  deltaTitle,
  foot,
  onClick,
}: {
  label: string;
  value: string;
  delta?: KpiDelta | null;
  /** Tooltip giải thích kỳ so sánh của delta. */
  deltaTitle?: string;
  foot: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-col gap-2 rounded-2xl border border-border-default bg-bg-surface p-4 text-left shadow-sm transition-colors hover:border-primary/30 hover:bg-bg-secondary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:p-5"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-text-secondary">{label}</span>
        {delta ? (
          <span
            title={deltaTitle}
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${DELTA_CLASS[delta.tone]}`}
          >
            {delta.text}
          </span>
        ) : null}
      </span>
      <span className="truncate text-2xl font-bold tabular-nums tracking-tight text-text-primary sm:text-[1.7rem]">
        {value}
      </span>
      <span className="line-clamp-2 text-xs tabular-nums text-text-secondary">{foot}</span>
    </button>
  );
}
