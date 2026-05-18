import type { ReactNode } from "react";
import type { CostStatus } from "@/dtos/cost.dto";

export const COST_STATUS_META = {
  pending: {
    label: "Chờ thanh toán",
    dotClassName: "bg-error",
    badgeClassName: "bg-error/15 text-error ring-1 ring-error/25",
    pillClassName:
      "border border-error/25 bg-error/10 text-error shadow-[inset_0_1px_0_color-mix(in_srgb,var(--ue-bg-surface)_35%,transparent)]",
  },
  paid: {
    label: "Đã thanh toán",
    dotClassName: "bg-success",
    badgeClassName: "bg-success/15 text-success ring-1 ring-success/25",
    pillClassName:
      "border border-success/25 bg-success/10 text-success shadow-[inset_0_1px_0_color-mix(in_srgb,var(--ue-bg-surface)_35%,transparent)]",
  },
} satisfies Record<
  CostStatus,
  {
    label: string;
    dotClassName: string;
    badgeClassName: string;
    pillClassName: string;
  }
>;

export const DEFAULT_BULK_COST_STATUS: CostStatus = "paid";

export function renderCostStatusOptionLabel(status: CostStatus): ReactNode {
  const meta = COST_STATUS_META[status];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.pillClassName}`}
    >
      <span
        className={`size-2 rounded-full ${meta.dotClassName}`}
        aria-hidden
      />
      {meta.label}
    </span>
  );
}

export const COST_STATUS_OPTIONS = (
  [
    { value: "pending", label: renderCostStatusOptionLabel("pending") },
    { value: "paid", label: renderCostStatusOptionLabel("paid") },
  ] as const
).map((option) => ({
  value: option.value,
  label: option.label,
}));

export function getCostStatusLabel(
  status: CostStatus | string | null | undefined,
): string {
  if (status === "pending" || status === "paid") {
    return COST_STATUS_META[status].label;
  }

  return status ? String(status) : "—";
}

export function getCostStatusChipClass(
  status: CostStatus | string | null | undefined,
): string {
  if (status === "pending" || status === "paid") {
    return COST_STATUS_META[status].badgeClassName;
  }

  return "bg-bg-secondary text-text-secondary ring-1 ring-border-default";
}
