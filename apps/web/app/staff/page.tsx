"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getExtraAllowanceStatusChipClass,
  getExtraAllowanceStatusLabel,
} from "@/components/admin/extra-allowance/extraAllowancePresentation";
import type {
  ExtraAllowanceListItem,
  ExtraAllowanceListResponse,
  ExtraAllowanceStatus,
} from "@/dtos/extra-allowance.dto";
import {
  getFullProfile,
  getMyStaffExtraAllowances,
  getMyStaffIncomeSummary,
} from "@/lib/apis/auth.api";
import { formatCurrency } from "@/lib/class.helpers";
import { ROLE_LABELS } from "@/lib/staff.constants";

const RECENT_UNPAID_DAYS = 14;
const MAX_VISIBLE_ALLOWANCES = 20;

function getCurrentMonth() {
  const now = new Date();
  return {
    month: String(now.getMonth() + 1).padStart(2, "0"),
    year: String(now.getFullYear()),
  };
}

function formatMonthLabel(value: string | null | undefined) {
  if (!value?.trim()) return "—";
  const matched = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!matched) return value;
  return `Tháng ${matched[2]}/${matched[1]}`;
}

function resolveNote(note: string | null | undefined) {
  return note?.trim() || "Chưa có ghi chú.";
}

/* ------------------------------------------------------------------ */
/*  Shared presentational helpers                                      */
/* ------------------------------------------------------------------ */

function DashboardCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PlaceholderCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <DashboardCard title={title}>
      <div className="rounded-lg border border-dashed border-border-default bg-bg-secondary/40 px-4 py-6 text-center">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="mt-1 text-xs text-text-muted">{description}</p>
      </div>
    </DashboardCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading state                                                      */
/* ------------------------------------------------------------------ */

function StaffRootLoadingState() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6"
      aria-busy="true"
    >
      <div className="mb-6 h-8 w-56 animate-pulse rounded-lg bg-bg-tertiary" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`staff-root-loading-card-${i}`}
            className="h-28 animate-pulse rounded-2xl border border-border-default bg-bg-surface"
          />
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
        <div className="h-[340px] animate-pulse rounded-[2rem] border border-border-default bg-bg-surface" />
        <div className="h-[340px] animate-pulse rounded-[2rem] border border-border-default bg-bg-surface" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Assistant detail — status pill                                     */
/* ------------------------------------------------------------------ */

function AllowanceStatusPill({
  status,
}: {
  status: ExtraAllowanceStatus | null | undefined;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ${getExtraAllowanceStatusChipClass(status)}`}
    >
      {getExtraAllowanceStatusLabel(status)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Assistant detail — metric tiles                                    */
/* ------------------------------------------------------------------ */

function MetricTile({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "amber" | "rose" | "emerald";
}) {
  const accentMap = {
    amber:
      "border-warning/25 bg-[linear-gradient(135deg,rgba(245,158,11,0.08),rgba(255,255,255,0.95))]",
    rose: "border-error/20 bg-[linear-gradient(135deg,rgba(239,68,68,0.06),rgba(255,255,255,0.95))]",
    emerald:
      "border-success/25 bg-[linear-gradient(135deg,rgba(16,185,129,0.07),rgba(255,255,255,0.95))]",
    default: "border-border-default bg-bg-surface",
  } as const;

  return (
    <article
      className={`rounded-2xl border px-5 py-4 shadow-sm ${accentMap[accent]}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
        {label}
      </p>
      <p className="mt-2.5 text-[1.65rem] font-semibold tabular-nums tracking-tight text-text-primary">
        {value}
      </p>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Assistant detail — allowance row (mobile card)                     */
/* ------------------------------------------------------------------ */

function AllowanceMobileCard({ item }: { item: ExtraAllowanceListItem }) {
  return (
    <article className="rounded-2xl border border-border-default bg-bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-muted">
            {formatMonthLabel(item.month)}
          </p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums text-text-primary">
            {formatCurrency(item.amount ?? 0)}
          </p>
        </div>
        <AllowanceStatusPill status={item.status} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">
        {resolveNote(item.note)}
      </p>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Assistant detail — main view                                       */
/* ------------------------------------------------------------------ */

function AssistantDetailView({
  staffName,
  roles,
  monthlyTotal,
  monthlyUnpaid,
  assistantAllowanceTotal,
  pendingCount,
  paidCount,
  allowances,
  totalAvailable,
  isAllowancesLoading,
}: {
  staffName: string;
  roles: string[];
  monthlyTotal: number;
  monthlyUnpaid: number;
  assistantAllowanceTotal: number;
  pendingCount: number;
  paidCount: number;
  allowances: ExtraAllowanceListItem[];
  totalAvailable: number;
  isAllowancesLoading: boolean;
}) {
  const visibilityNote =
    totalAvailable > allowances.length
      ? `Hiển thị ${allowances.length}/${totalAvailable} khoản gần nhất.`
      : `Toàn bộ ${allowances.length} khoản trợ cấp trợ lí.`;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6">
      {/* ── Header ── */}
      <header className="relative overflow-hidden rounded-[1.75rem] border border-warning/20 bg-[linear-gradient(130deg,rgba(255,255,255,0.98),rgba(253,251,247,0.96),rgba(245,158,11,0.07)),radial-gradient(circle_at_80%_20%,rgba(245,158,11,0.14),transparent_45%)] p-5 shadow-sm sm:p-6 lg:p-8">
        <div
          className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-warning/10 blur-3xl"
          aria-hidden
        />

        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-warning">
              Trợ lí
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
              {staffName}
            </h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {roles.map((role) => (
                <span
                  key={role}
                  className="inline-flex rounded-full border border-warning/15 bg-white/80 px-2.5 py-0.5 text-xs font-medium text-text-secondary shadow-sm"
                >
                  {ROLE_LABELS[role] ?? role}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end">
            <Link
              href="/staff/profile"
              className="inline-flex min-h-10 items-center rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Hồ sơ nhân sự
            </Link>
            <Link
              href="/staff/dashboard"
              className="inline-flex min-h-10 items-center rounded-xl bg-warning/90 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Staff detail
            </Link>
          </div>
        </div>
      </header>

      {/* ── Metric tiles ── */}
      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Thu nhập tháng"
          value={formatCurrency(monthlyTotal)}
          accent="amber"
        />
        <MetricTile
          label="Chưa nhận"
          value={formatCurrency(monthlyUnpaid)}
          accent="rose"
        />
        <MetricTile
          label="Trợ cấp trợ lí"
          value={formatCurrency(assistantAllowanceTotal)}
          accent="emerald"
        />
        <MetricTile
          label="Chờ thanh toán"
          value={new Intl.NumberFormat("vi-VN").format(pendingCount)}
        />
      </section>

      {/* ── Allowance detail ── */}
      <section className="mt-4 rounded-[1.75rem] border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5 lg:p-6">
        <div className="flex flex-col gap-3 border-b border-border-default pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-text-primary sm:text-lg">
                Chi tiết trợ cấp trợ lí
              </h2>
              <span className="inline-flex rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning ring-1 ring-warning/25">
                Trợ lí
              </span>
            </div>
            <p className="mt-1 text-sm text-text-muted">{visibilityNote}</p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full border border-success/20 bg-success/8 px-2.5 py-1">
              <span className="size-1.5 rounded-full bg-success" aria-hidden />
              <span className="text-xs font-medium text-success">
                {paidCount} đã thanh toán
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-error/20 bg-error/8 px-2.5 py-1">
              <span className="size-1.5 rounded-full bg-error" aria-hidden />
              <span className="text-xs font-medium text-error">
                {pendingCount} chờ
              </span>
            </div>
          </div>
        </div>

        {isAllowancesLoading ? (
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`allowance-skeleton-${i}`}
                className="h-20 animate-pulse rounded-2xl border border-border-default bg-bg-secondary/50"
              />
            ))}
          </div>
        ) : allowances.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border-default bg-bg-secondary/30 px-6 py-10 text-center">
            <p className="text-sm font-medium text-text-muted">
              Chưa có khoản trợ cấp trợ lí nào.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="mt-4 space-y-3 lg:hidden">
              {allowances.map((item) => (
                <AllowanceMobileCard key={item.id} item={item} />
              ))}
            </div>

            {/* Desktop table */}
            <div className="mt-4 hidden overflow-hidden rounded-xl border border-border-default lg:block">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-left">
                  <colgroup>
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "42%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "20%" }} />
                  </colgroup>
                  <thead className="bg-bg-secondary/80">
                    <tr className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      <th className="px-4 py-3" scope="col">
                        Tháng
                      </th>
                      <th className="px-4 py-3" scope="col">
                        Ghi chú
                      </th>
                      <th className="px-4 py-3" scope="col">
                        Trạng thái
                      </th>
                      <th className="px-4 py-3 text-right" scope="col">
                        Số tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allowances.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-border-default bg-bg-surface transition-colors hover:bg-bg-secondary/30"
                      >
                        <td className="px-4 py-3 align-top text-sm font-medium text-text-primary">
                          {formatMonthLabel(item.month)}
                        </td>
                        <td className="px-4 py-3 align-top text-sm text-text-secondary">
                          <p className="line-clamp-2 break-words">
                            {resolveNote(item.note)}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <AllowanceStatusPill status={item.status} />
                        </td>
                        <td className="px-4 py-3 text-right align-top text-sm font-semibold tabular-nums text-text-primary">
                          {formatCurrency(item.amount ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Regular staff dashboard (non-assistant)                            */
/* ------------------------------------------------------------------ */

function StaffDashboardOverview({
  staffName,
  staffRoles,
  monthlyTotal,
  monthlyUnpaid,
  monthlyPaid,
  todayClasses,
}: {
  staffName: string;
  staffRoles: string[];
  monthlyTotal: number;
  monthlyUnpaid: number;
  monthlyPaid: number;
  todayClasses: Array<{ classId: string; className: string; total: number }>;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6">
      <header className="mb-6">
        <h1 className="text-lg font-semibold text-text-primary sm:text-xl">
          Xin chào, {staffName}
        </h1>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {staffRoles.map((role) => (
            <span
              key={role}
              className="inline-flex rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {ROLE_LABELS[role] ?? role}
            </span>
          ))}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard title="Thu nhập tháng này">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Tổng</span>
              <span className="tabular-nums text-sm font-semibold text-primary">
                {formatCurrency(monthlyTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Chưa nhận</span>
              <span className="tabular-nums text-sm font-semibold text-error">
                {formatCurrency(monthlyUnpaid)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Đã nhận</span>
              <span className="tabular-nums text-sm font-semibold text-success">
                {formatCurrency(monthlyPaid)}
              </span>
            </div>
          </div>
          <Link
            href="/staff/profile"
            className="mt-3 inline-block text-xs font-medium text-primary hover:text-primary-hover"
          >
            Xem chi tiết &rarr;
          </Link>
        </DashboardCard>

        <DashboardCard title="Lớp phụ trách">
          {todayClasses.length === 0 ? (
            <p className="text-sm text-text-muted">Chưa gán lớp nào.</p>
          ) : (
            <ul className="space-y-2">
              {todayClasses.map((c) => (
                <li
                  key={c.classId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate text-text-primary">
                    {c.className}
                  </span>
                  <span className="shrink-0 tabular-nums font-medium text-primary">
                    {formatCurrency(c.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <PlaceholderCard
          title="Thông báo"
          description="Sắp có — thông báo hệ thống sẽ hiển thị ở đây."
        />

        <PlaceholderCard
          title="Cảnh báo trợ cấp tuần"
          description="Sắp có — cảnh báo chưa xác nhận trợ cấp tuần sẽ hiển thị ở đây."
        />

        <PlaceholderCard
          title="Lớp chưa điền lịch / khảo sát"
          description="Sắp có — lớp chưa có lịch học hoặc chưa điền khảo sát sẽ hiển thị ở đây."
        />

        <PlaceholderCard
          title="Lịch hôm nay"
          description="Sắp có — các lớp có giờ hôm nay sẽ hiển thị ở đây."
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Root page                                                          */
/* ------------------------------------------------------------------ */

export default function StaffDashboardPage() {
  const { month, year } = getCurrentMonth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["auth", "full-profile"],
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });

  const linkedStaffId = profile?.staffInfo?.id ?? "";
  const rawStaffRoles = profile?.staffInfo?.roles;
  const staffRoles = useMemo(() => rawStaffRoles ?? [], [rawStaffRoles]);
  const isAssistant =
    profile?.roleType === "staff" && staffRoles.includes("assistant");

  const { data: incomeSummary } = useQuery({
    queryKey: [
      "staff",
      "self",
      "income-summary",
      year,
      month,
      RECENT_UNPAID_DAYS,
    ],
    queryFn: () =>
      getMyStaffIncomeSummary({ month, year, days: RECENT_UNPAID_DAYS }),
    enabled: !!linkedStaffId,
    staleTime: 30_000,
  });

  const { data: allowanceResponse, isLoading: isAllowancesLoading } =
    useQuery<ExtraAllowanceListResponse>({
      queryKey: [
        "extra-allowance",
        "self",
        "role-detail",
        "assistant",
        MAX_VISIBLE_ALLOWANCES,
      ],
      queryFn: () =>
        getMyStaffExtraAllowances({
          page: 1,
          limit: MAX_VISIBLE_ALLOWANCES,
          roleType: "assistant",
        }),
      enabled: !!linkedStaffId && isAssistant,
      staleTime: 60_000,
    });

  const monthlyTotals = incomeSummary?.monthlyIncomeTotals ?? {
    total: 0,
    paid: 0,
    unpaid: 0,
  };
  const classSummaries = incomeSummary?.classMonthlySummaries ?? [];
  const todayClasses = classSummaries.slice(0, 5);

  const assistantRoleSummary = useMemo(
    () =>
      incomeSummary?.otherRoleSummaries?.find(
        (item) => item.role === "assistant",
      ) ?? {
        role: "assistant",
        label: ROLE_LABELS.assistant,
        total: 0,
        paid: 0,
        unpaid: 0,
      },
    [incomeSummary?.otherRoleSummaries],
  );

  const allowances = allowanceResponse?.data ?? [];
  const paidCount = allowances.filter((a) => a.status === "paid").length;
  const pendingCount = allowances.filter((a) => a.status === "pending").length;
  const totalAvailable = allowanceResponse?.meta.total ?? allowances.length;

  if (profileLoading) {
    return <StaffRootLoadingState />;
  }

  const staffName =
    profile?.staffInfo?.fullName?.trim() || profile?.email || "Nhân sự";

  if (isAssistant) {
    return (
      <AssistantDetailView
        staffName={staffName}
        roles={staffRoles}
        monthlyTotal={monthlyTotals.total}
        monthlyUnpaid={monthlyTotals.unpaid}
        assistantAllowanceTotal={assistantRoleSummary.total}
        pendingCount={pendingCount}
        paidCount={paidCount}
        allowances={allowances}
        totalAvailable={totalAvailable}
        isAllowancesLoading={isAllowancesLoading}
      />
    );
  }

  return (
    <StaffDashboardOverview
      staffName={staffName}
      staffRoles={staffRoles}
      monthlyTotal={monthlyTotals.total}
      monthlyUnpaid={monthlyTotals.unpaid}
      monthlyPaid={monthlyTotals.paid}
      todayClasses={todayClasses}
    />
  );
}
