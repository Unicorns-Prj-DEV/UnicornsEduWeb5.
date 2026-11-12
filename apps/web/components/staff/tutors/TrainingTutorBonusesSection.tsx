"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { MonthInput } from "@/components/ui/MonthInput";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import {
  listTrainingTutorBonuses,
  trainingTutorKeys,
} from "@/lib/apis/training-tutor.api";
import { formatCurrency } from "@/lib/class.helpers";
import { getDefaultMonthKey } from "@/lib/month-format";

function formatBonusDate(date: string): string {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
}

/**
 * Thưởng của cấp dưới (có số tiền) — Trưởng ban Đào tạo chỉ xem, không tạo /
 * sửa / xoá (#278). Thưởng không phải thu nhập cá nhân.
 */
export default function TrainingTutorBonusesSection({
  staffId,
}: {
  staffId: string;
}) {
  const [month, setMonth] = useState(getDefaultMonthKey);
  const { data, isLoading, isError } = useQuery({
    queryKey: trainingTutorKeys.bonuses(staffId, month),
    queryFn: () => listTrainingTutorBonuses(staffId, month),
  });
  useQueryErrorToast(isError, "Không tải được thưởng.");
  const rows = data ?? [];

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Thưởng</h2>
          <p className="text-xs text-text-muted">
            Chỉ xem. Tạo / sửa thưởng do Admin thực hiện.
          </p>
        </div>
        <MonthInput
          aria-label="Tháng thưởng"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="sm:w-48"
        />
      </div>
      {isLoading ? (
        <Skeleton className="h-16 w-full rounded-lg" />
      ) : rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">
          Không có thưởng trong tháng.
        </p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-col gap-1 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm font-medium wrap-anywhere text-text-primary">
                  {row.workType}
                </span>
                <span className="text-sm font-semibold tabular-nums text-text-primary">
                  {formatCurrency(row.amount)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                <span>{formatBonusDate(row.date)}</span>
                <Badge variant={row.status === "paid" ? "success" : "warning"}>
                  {row.status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
                </Badge>
              </div>
              {row.note?.trim() ? (
                <p className="text-sm text-text-secondary wrap-anywhere">
                  {row.note}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
