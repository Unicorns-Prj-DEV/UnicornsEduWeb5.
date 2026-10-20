"use client";

import type { AdminDashboardBreakdownItem, AdminDashboardBreakdownKey } from "@/dtos/dashboard.dto";
import { DashboardPanel } from "./DashboardPanel";
import { formatCurrency, formatShare } from "./format";

/** Breakdown key → `sources[].key` của financial-detail "personnel-cost". Bonus = thưởng + phạt. */
export const PERSONNEL_SOURCE_KEYS: Partial<Record<AdminDashboardBreakdownKey, string[]>> = {
  teacherCost: ["teacher-cost"],
  customerCareCost: ["customer-care-cost"],
  lessonCost: ["lesson-cost"],
  bonusCost: ["bonus-reward-cost", "bonus-penalty-cost"],
  extraAllowanceCost: ["extra-allowance-cost"],
  fixedSalaryCost: ["fixed-salary-cost"],
  assistantCost: ["assistant-cost"],
  trainingManagerCost: ["training-manager-cost"],
};

export function getPersonnelBreakdownItems(breakdown: AdminDashboardBreakdownItem[]) {
  return breakdown.filter((item) => item.kind === "expense" && PERSONNEL_SOURCE_KEYS[item.key] != null);
}

export function PersonnelCostBreakdown({
  items,
  total,
  dimmed,
  onOpenTotal,
  onOpenItem,
}: {
  items: AdminDashboardBreakdownItem[];
  total: number;
  dimmed?: boolean;
  onOpenTotal: () => void;
  onOpenItem: (item: AdminDashboardBreakdownItem) => void;
}) {
  const sorted = [...items].sort((a, b) => b.amount - a.amount);
  // Độ dài thanh = tỉ trọng trên tổng chi phí nhân sự, khớp với % hiển thị bên phải.
  const sharePercent = (amount: number) => (total > 0 ? Math.min(Math.max((amount / total) * 100, 0), 100) : 0);

  return (
    <DashboardPanel
      title="Cơ cấu chi phí nhân sự"
      description="Thanh = tỉ trọng trên tổng chi phí nhân sự · bấm từng dòng để xem nhân sự đóng góp"
      dimmed={dimmed}
      className="lg:col-span-2"
      action={
        <button
          type="button"
          onClick={onOpenTotal}
          className="rounded-md px-1 text-sm font-bold tabular-nums text-text-primary underline-offset-2 hover:text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          {formatCurrency(total)}
        </button>
      }
    >
      <ul className="flex flex-col gap-1">
        {sorted.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onOpenItem(item)}
              className="grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:grid-cols-[150px_minmax(0,1fr)_12.5rem]"
            >
              <span className="text-text-primary">{item.label}</span>
              <span
                aria-hidden
                className="order-last col-span-2 h-2 overflow-hidden rounded-full bg-bg-secondary sm:order-none sm:col-span-1"
              >
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${sharePercent(item.amount)}%` }}
                />
              </span>
              <span className="whitespace-nowrap text-right tabular-nums">
                <strong className="font-semibold text-text-primary">{formatCurrency(item.amount)}</strong>{" "}
                <span className="text-text-secondary">· {formatShare(item.amount, total)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </DashboardPanel>
  );
}
