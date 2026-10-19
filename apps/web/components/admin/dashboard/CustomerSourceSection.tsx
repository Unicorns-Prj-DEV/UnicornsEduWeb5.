"use client";

import type { AdminDashboardCustomerSourceRow } from "@/dtos/dashboard.dto";
import { formatVnInteger } from "@/lib/formatters";
import { DashboardPanel } from "./overview/DashboardPanel";
import { formatCurrency, formatPercent } from "./overview/format";

export function CustomerSourceSection({
  rows,
  dimmed = false,
  onOpen,
}: {
  rows: AdminDashboardCustomerSourceRow[];
  dimmed?: boolean;
  onOpen: (row: AdminDashboardCustomerSourceRow) => void;
}) {
  const sorted = [...rows].sort((a, b) => b.revenue - a.revenue);

  return (
    <DashboardPanel
      title="Nguồn khách mới"
      description="Học sinh mới của kỳ và doanh thu mới theo nguồn trên hồ sơ · bấm để xem danh sách"
      dimmed={dimmed}
    >
      {sorted.length === 0 ? (
        <p className="text-sm text-text-secondary">Chưa có học sinh mới trong kỳ.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {sorted.map((row) => (
            <li key={row.key}>
              <button
                type="button"
                onClick={() => onOpen(row)}
                aria-label={`Mở chi tiết nguồn ${row.label}`}
                className="flex min-h-11 w-full flex-col gap-1.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <span className="flex w-full justify-between gap-2 text-sm">
                  <span className="font-medium text-text-primary">{row.label}</span>
                  <span className="font-bold tabular-nums text-text-primary">{formatPercent(row.sharePercent)}</span>
                </span>
                <span aria-hidden className="h-2 w-full overflow-hidden rounded-full bg-bg-secondary">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(Math.max(row.sharePercent, 0), 100)}%` }}
                  />
                </span>
                <span className="flex w-full justify-between gap-2 text-xs tabular-nums text-text-secondary">
                  <span>{formatVnInteger(row.studentCount)} học sinh</span>
                  <span>{formatCurrency(row.revenue)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </DashboardPanel>
  );
}
