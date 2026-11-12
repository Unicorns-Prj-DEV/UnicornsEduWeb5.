"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MonthInput } from "@/components/ui/MonthInput";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import {
  listSaleCsTeamSaleAllowances,
  saleCsTeamKeys,
} from "@/lib/apis/sale-cs-team.api";
import { getDefaultMonthKey } from "@/lib/month-format";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Trợ cấp sale của thành viên: học sinh, ghi chú, ngày — không có số tiền. */
export default function SaleCsTeamSaleAllowancesSection({
  staffId,
}: {
  staffId: string;
}) {
  const [month, setMonth] = useState(getDefaultMonthKey);
  const { data, isLoading, isError } = useQuery({
    queryKey: saleCsTeamKeys.saleAllowances(staffId, month),
    queryFn: () => listSaleCsTeamSaleAllowances(staffId, month),
  });
  useQueryErrorToast(isError, "Không tải được trợ cấp sale.");
  const rows = data ?? [];

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Trợ cấp sale
          </h2>
          <p className="text-xs text-text-muted">
            Học sinh, ghi chú và ngày ghi nhận. Số tiền do Admin quản lý.
          </p>
        </div>
        <MonthInput
          aria-label="Tháng trợ cấp sale"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="sm:w-48"
        />
      </div>
      {isLoading ? (
        <Skeleton className="h-16 w-full rounded-lg" />
      ) : rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">
          Không có trợ cấp sale trong tháng.
        </p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-col gap-0.5 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm font-medium wrap-anywhere text-text-primary">
                  {row.student?.fullName ?? "Không gắn học sinh"}
                </span>
                <span className="text-xs text-text-muted">
                  {dateFormatter.format(new Date(row.createdAt))}
                </span>
              </div>
              <p className="text-sm text-text-secondary wrap-anywhere">
                {row.note?.trim() || "—"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
