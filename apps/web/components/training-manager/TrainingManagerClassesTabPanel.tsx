"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MonthInput } from "@/components/ui/MonthInput";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrainingManagerManagedClassItem } from "@/dtos/training-manager.dto";
import { getTrainingManagerManagedClasses } from "@/lib/apis/training-manager.api";
import {
  buildAdminLikePath,
  resolveAdminLikeRouteBase,
} from "@/lib/admin-shell-paths";
import { formatCurrency } from "@/lib/class.helpers";
import { formatMonthKeyLabel, getDefaultMonthKey } from "@/lib/month-format";
import { cn } from "@/lib/utils";

type Props = {
  staffId: string;
  workspaceMode?: "self" | "admin";
  classLinkBase?: "staff" | "admin";
};

const ROW_GRID_CLASS =
  "grid-cols-[minmax(0,1fr)_minmax(7rem,8.5rem)_minmax(7rem,8.5rem)]";

function ManagedClassRow({
  item,
  href,
}: {
  item: TrainingManagerManagedClassItem;
  href: string;
}) {
  return (
    <div
      className={cn(
        "grid items-center gap-2 border-b border-border-default/70 px-3 py-3 text-sm last:border-b-0 sm:gap-3 sm:px-4",
        ROW_GRID_CLASS,
      )}
    >
      <Link
        href={href}
        className="min-w-0 truncate font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        {item.className}
      </Link>
      <p className="text-right font-semibold tabular-nums text-text-primary">
        {formatCurrency(item.monthTotal)}
      </p>
      <p className="text-right font-semibold tabular-nums text-warning">
        {formatCurrency(item.pendingTotal)}
      </p>
    </div>
  );
}

export default function TrainingManagerClassesTabPanel({
  staffId,
  workspaceMode = "self",
  classLinkBase,
}: Props) {
  const [monthKey, setMonthKey] = useState(getDefaultMonthKey);
  const routeBase = useMemo(
    () => classLinkBase ?? (workspaceMode === "admin" ? "admin" : "staff"),
    [classLinkBase, workspaceMode],
  );
  const adminLikeBase = resolveAdminLikeRouteBase();

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["training-manager", "managed-classes", staffId, monthKey],
    queryFn: () => getTrainingManagerManagedClasses(staffId, monthKey),
    enabled: Boolean(staffId),
    staleTime: 30_000,
  });

  const rows = data?.data ?? [];
  const summary = data?.summary;

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-border-default bg-bg-surface shadow-sm">
      <div className="border-b border-border-default px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary sm:text-lg">
              Lớp học (Số lượng: {summary?.classCount ?? 0})
            </h2>
            <p className="mt-1 text-xs text-text-muted sm:text-sm">
              Tổng nhận tháng {formatMonthKeyLabel(monthKey)}:{" "}
              <span className="font-semibold tabular-nums text-text-primary">
                {formatCurrency(summary?.totalMonth ?? 0)}
              </span>
              {" · "}
              Chưa thanh toán (all-time):{" "}
              <span className="font-semibold tabular-nums text-warning">
                {formatCurrency(summary?.totalPending ?? 0)}
              </span>
            </p>
          </div>
          <MonthInput
            value={monthKey}
            onChange={(event) => setMonthKey(event.target.value)}
          />
        </div>
      </div>

      <div
        className={cn(
          "hidden border-b border-border-default bg-bg-secondary/70 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted sm:grid sm:px-5",
          ROW_GRID_CLASS,
        )}
      >
        <span>Tên lớp</span>
        <span className="text-right">Tổng tháng</span>
        <span className="text-right">Chưa TT</span>
      </div>

      <div
        className={cn(
          "transition-opacity",
          isFetching && !isLoading && "opacity-70",
        )}
      >
        {isLoading ? (
          <div className="space-y-3 px-4 py-4 sm:px-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <p className="px-4 py-8 text-center text-sm text-error sm:px-5">
            Không tải được danh sách lớp quản lý.
          </p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-text-muted sm:px-5">
            Chưa có lớp nào được gán quản lý trong tháng này.
          </p>
        ) : (
          <div>
            {rows.map((item) => {
              const href =
                routeBase === "admin"
                  ? buildAdminLikePath(
                      adminLikeBase,
                      `/classes/${encodeURIComponent(item.classId)}`,
                    )
                  : `/staff/classes/${encodeURIComponent(item.classId)}`;

              return (
                <ManagedClassRow key={item.classId} item={item} href={href} />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
