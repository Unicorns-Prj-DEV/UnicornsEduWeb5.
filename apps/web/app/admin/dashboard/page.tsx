"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DateInput } from "@/components/ui/DateInput";
import { Skeleton } from "@/components/ui/skeleton";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getAdminDashboard,
  getAdminDashboardFinancialDetail,
} from "@/lib/apis/dashboard.api";
import { getFullProfile } from "@/lib/apis/auth.api";
import { formatMonthPartsLabel } from "@/lib/month-format";
import {
  buildAdminLikePath,
  resolveAdminLikeRouteBase,
} from "@/lib/admin-shell-paths";
import AlertGroupCard from "@/components/admin/dashboard/AlertGroupCard";
import DashboardAlertListDialog from "@/components/admin/dashboard/DashboardAlertListDialog";
import type { AlertGroupTone } from "@/components/admin/dashboard/alert-group-styles";
import type {
  AdminDashboardActionAlert,
  AdminDashboardActionAlertGroup,
  AdminDashboardDto,
  AdminDashboardFinancialDetail,
  AdminDashboardFinancialDetailRowKey,
  AdminDashboardFinancialDetailSource,
} from "@/dtos/dashboard.dto";

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)} đ`;
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
  ) {
    return (error as { response?: { data?: { message?: string } } }).response?.data?.message as string;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Không thể tải dashboard từ dữ liệu thật.";
}

function DashboardIcon({ path }: { path: string }) {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

function KpiCard({
  title,
  value,
  note,
  tone,
  onClick,
}: {
  title: string;
  value: string;
  note: string;
  tone: "primary" | "success" | "warning" | "default";
  onClick?: () => void;
}) {
  const accent =
    tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : tone === "primary" ? "bg-primary" : "bg-border-focus";
  
  const clickStyles = onClick
    ? "cursor-pointer hover:border-primary/30 hover:bg-bg-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
    : "";
  const cardClasses = `relative overflow-hidden rounded-xl border border-border-default bg-bg-surface px-3 py-3 shadow-sm text-left w-full transition-all duration-200 ${clickStyles}`;
  
  const content = (
    <>
      <span className={`absolute bottom-0 left-0 top-0 w-1 ${accent}`} aria-hidden />
      <div className="pl-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">{title}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">{value}</p>
        <p className="mt-1 line-clamp-1 text-xs text-text-secondary">{note}</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cardClasses}>
        {content}
      </button>
    );
  }

  return (
    <div className={cardClasses}>
      {content}
    </div>
  );
}

function QuickViewCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary/25 p-4">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-text-primary">{value}</p>
      <p className="mt-1 text-xs text-text-secondary">{description}</p>
    </div>
  );
}

function formatFinancialSourceAmount(source: AdminDashboardFinancialDetailSource) {
  if (source.tone === "negative" && source.amount !== 0) {
    return `- ${formatCurrency(source.amount)}`;
  }

  if (source.tone === "positive" && source.amount !== 0) {
    return `+ ${formatCurrency(source.amount)}`;
  }

  return formatCurrency(source.amount);
}

function getFinancialSourceAccentClasses(tone: AdminDashboardFinancialDetailSource["tone"]) {
  if (tone === "positive") {
    return {
      card: "border-success/25 bg-success/5",
      value: "text-success",
    };
  }

  if (tone === "negative") {
    return {
      card: "border-error/20 bg-error/5",
      value: "text-error",
    };
  }

  return {
    card: "border-border-default bg-bg-secondary/35",
    value: "text-text-primary",
  };
}

function getAmountForSource(
  item: { amount: number; note: string | null; secondaryLabel?: string | null },
  sourceKey: string,
  rowKey: string
): { amount: number; note: string | null } {
  // If rowKey is pending-payroll or personnel-cost, they use the note-prefix-split mapping:
  if (rowKey === "pending-payroll" || rowKey === "personnel-cost") {
    if (!item.note) return { amount: 0, note: null };
    const prefixMap: Record<string, string> = {
      "pending-session": "Buổi dạy",
      "pending-customer-care": "CSKH",
      "pending-lesson": "Giáo án",
      "pending-bonus": "Bonus",
      "pending-extra": "Trợ cấp",
      "teacher-cost": "Dạy",
      "customer-care-cost": "CSKH",
      "lesson-cost": "Giáo án",
      "bonus-cost": "Bonus",
    };
    const prefix = prefixMap[sourceKey];
    if (!prefix) return { amount: item.amount, note: item.note };

    const parts = item.note.split(" • ");
    const matchingPart = parts.find((p) => p.startsWith(prefix));
    if (!matchingPart) return { amount: 0, note: null };

    const digitStr = matchingPart.replace(/[^\d]/g, "");
    const amount = parseInt(digitStr, 10) || 0;
    // Keep sign of original item amount
    const signedAmount = item.amount < 0 ? -amount : amount;
    return { amount: signedAmount, note: matchingPart };
  }

  // If rowKey is other-cost, profit, or total-in, they filter by secondaryLabel:
  if (rowKey === "other-cost" || rowKey === "profit" || rowKey === "total-in") {
    const labelMap: Record<string, string> = {
      "operating-cost": "Chi phí vận hành",
      "extra-allowance-cost": "Trợ cấp khác",
      "profit-revenue": "Học phí đã học",
      "profit-personnel": "Chi phí nhân sự",
      "profit-other": "Chi phí khác",
      "total-in-topup": "Dòng tiền vào",
      "total-in-personnel": "Chi phí nhân sự",
      "total-in-other": "Chi phí khác",
    };
    const targetLabel = labelMap[sourceKey];
    if (!targetLabel) return { amount: item.amount, note: item.note };

    if (item.secondaryLabel === targetLabel) {
      return { amount: item.amount, note: item.note };
    }
    return { amount: 0, note: null };
  }

  // Default: no filtering
  return { amount: item.amount, note: item.note };
}

function FinancialDetailModal({
  rowLabel,
  detail,
  isLoading,
  error,
  onClose,
}: {
  rowLabel: string;
  detail?: AdminDashboardFinancialDetail;
  isLoading: boolean;
  error: unknown;
  onClose: () => void;
}) {
  const dialogTitleId = useId();
  const [selectedSourceKey, setSelectedSourceKey] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (!detail) return [];
    if (!selectedSourceKey) return detail.items;

    return detail.items
      .map((item) => {
        const { amount, note } = getAmountForSource(item, selectedSourceKey, detail.rowKey);
        return { ...item, amount, note };
      })
      .filter((item) => item.amount !== 0);
  }, [detail, selectedSourceKey]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-bg-primary/75 backdrop-blur-[2px]"
        aria-hidden
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 p-3 sm:p-6">
        <div className="mx-auto flex h-full w-full items-center max-w-6xl">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="flex h-auto max-h-full w-full flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-2xl overscroll-contain"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border-default px-5 py-4">
              <div>
                <h2 id={dialogTitleId} className="text-xl font-semibold text-balance text-text-primary">
                  {detail?.title ?? `Chi tiết ${rowLabel}`}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {detail?.description ?? "Đang tải chi tiết số liệu từ backend…"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                aria-label={`Đóng popup ${rowLabel}`}
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[72vh] overflow-auto px-4 py-4 sm:px-5">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 rounded-2xl" />
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <Skeleton key={idx} className="h-28 rounded-xl" />
                    ))}
                  </div>
                  <Skeleton className="h-64 rounded-xl" />
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <DashboardIcon path="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
                  <AlertTitle>Không tải được chi tiết số liệu</AlertTitle>
                  <AlertDescription>{getErrorMessage(error)}</AlertDescription>
                </Alert>
              ) : detail ? (
                <div className="space-y-4">
                  <section className="rounded-2xl border border-primary/15 bg-primary/8 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                      Tổng hợp
                    </p>
                    <p className="mt-2 text-3xl font-semibold tabular-nums text-text-primary">
                      {formatCurrency(detail.amount)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      {detail.description}
                    </p>
                  </section>

                  {detail.sources.length > 0 ? (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <DashboardIcon path="M3 12h18M12 3v18" />
                        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-text-primary">
                          Nguồn cộng trừ (Nhấp thẻ để lọc chi tiết)
                        </h3>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {detail.sources.map((source) => {
                          const isSelected = selectedSourceKey === source.key;
                          const accent = getFinancialSourceAccentClasses(source.tone);
                          
                          // Interactive style bindings for selection
                          const interactiveBorderClass = isSelected
                            ? source.tone === "positive"
                              ? "ring-2 ring-success border-success bg-success/10"
                              : source.tone === "negative"
                              ? "ring-2 ring-error border-error bg-error/10"
                              : "ring-2 ring-primary border-primary bg-primary/5"
                            : "hover:border-border-default/80 hover:bg-bg-secondary/50 cursor-pointer";

                          return (
                            <button
                              key={source.key}
                              type="button"
                              onClick={() => setSelectedSourceKey(prev => prev === source.key ? null : source.key)}
                              className={`rounded-xl border p-4 shadow-sm text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.995] select-none ${accent.card} ${interactiveBorderClass} w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-text-primary">{source.label}</p>
                                {isSelected && (
                                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary animate-pulse">
                                    Đang lọc
                                  </span>
                                )}
                              </div>
                              <p className={`mt-2 text-xl font-semibold tabular-nums ${accent.value}`}>
                                {formatFinancialSourceAmount(source)}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-text-secondary">{source.note}</p>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <DashboardIcon path="M4 7h16M4 12h16M4 17h10" />
                        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-text-primary">
                          Chi tiết đóng góp
                        </h3>
                      </div>
                      {selectedSourceKey && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-secondary">
                            Đang lọc theo: <span className="font-semibold text-primary">{detail.sources.find(s => s.key === selectedSourceKey)?.label}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedSourceKey(null)}
                            className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline"
                          >
                            Xoá bộ lọc
                          </button>
                        </div>
                      )}
                    </div>

                    {filteredItems.length > 0 ? (
                      <>
                        <div className="space-y-3 md:hidden">
                          {filteredItems.map((item) => (
                            <article key={item.id} className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                                  {item.secondaryLabel ? (
                                    <p className="mt-1 text-sm text-text-secondary">{item.secondaryLabel}</p>
                                  ) : null}
                                </div>
                                <p className="text-right text-sm font-semibold tabular-nums text-text-primary">
                                  {formatCurrency(item.amount)}
                                </p>
                              </div>
                              {item.note ? (
                                <p className="mt-3 border-t border-border-default pt-3 text-sm leading-6 text-text-secondary">
                                  {item.note}
                                </p>
                              ) : null}
                            </article>
                          ))}
                        </div>

                        <div className="hidden overflow-x-auto rounded-xl border border-border-default md:block">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-border-default hover:bg-transparent">
                                <TableHead className="min-w-[220px]">Nội dung</TableHead>
                                <TableHead className="min-w-[180px]">Nguồn</TableHead>
                                <TableHead className="min-w-[180px] text-right">Giá trị</TableHead>
                                <TableHead className="min-w-[260px]">Ghi chú</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredItems.map((item) => (
                                <TableRow key={item.id} className="border-border-default/80">
                                  <TableCell className="align-top font-medium text-text-primary">{item.label}</TableCell>
                                  <TableCell className="align-top text-text-secondary">
                                    {item.secondaryLabel ?? "—"}
                                  </TableCell>
                                  <TableCell className="align-top text-right font-semibold tabular-nums text-text-primary">
                                    {formatCurrency(item.amount)}
                                  </TableCell>
                                  <TableCell className="align-top text-text-secondary">
                                    {item.note ?? "—"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border-default bg-bg-secondary/35 px-4 py-6 text-sm text-text-secondary">
                        {selectedSourceKey
                          ? "Không có khoản đóng góp nào phù hợp với bộ lọc."
                          : detail.emptyState}
                      </div>
                    )}
                  </section>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


function stepMonth(month: string, year: string, delta: number) {
  const d = new Date(Number(year), Number(month) - 1 + delta, 1);
  return {
    month: String(d.getMonth() + 1).padStart(2, "0"),
    year: String(d.getFullYear()),
  };
}

function getBreakdownAmount(dashboard: AdminDashboardDto, key: string) {
  return dashboard.breakdown.find((item) => item.key === key)?.amount ?? 0;
}

function exportCsv(filename: string, rows: Array<{ label: string; value: string; note: string }>) {
  const header = "Danh mục,Giá trị,Ghi chú\n";
  const body = rows
    .map((row) =>
      `"${row.label.replace(/"/g, '""')}","${row.value.replace(/"/g, '""')}","${row.note.replace(/"/g, '""')}"`,
    )
    .join("\n");
  const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

type QuickViewKey = "finance" | "ops" | "students";

type FinancialSummaryRow = {
  key: AdminDashboardFinancialDetailRowKey;
  label: string;
  value: number;
  note: string;
  emphasize?: boolean;
};

function DashboardLoadingState() {
  return (
    <div className="min-h-full bg-bg-primary p-4 sm:p-6" aria-busy="true" aria-live="polite">
      <div className="mx-auto w-full max-w-[1320px] space-y-4">
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

function AssistantDashboardRedirect({
  staffId,
}: {
  staffId?: string;
}) {
  const { replace } = useRouter();
  const pathname = usePathname();
  const routeBase = resolveAdminLikeRouteBase(pathname);

  useEffect(() => {
    if (staffId) {
      replace(
        buildAdminLikePath(routeBase, `staffs/${encodeURIComponent(staffId)}`),
      );
      return;
    }

    replace("/user-profile");
  }, [routeBase, replace, staffId]);

  return (
    <div className="min-h-full bg-bg-primary p-4 sm:p-6">
      <div className="mx-auto w-full max-w-[1020px]">
        <section className="overflow-hidden rounded-[1.75rem] border border-primary/20 bg-bg-surface shadow-sm">
          <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-end">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
                Assistant Workspace
              </p>
              <h1 className="mt-3 max-w-2xl text-2xl font-semibold tracking-[-0.03em] text-text-primary sm:text-3xl">
                Đang mở hồ sơ nhân sự thay cho dashboard tổng hợp.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
                Trợ lí dùng chung toàn bộ admin workspace, nhưng route dashboard sẽ tự chuyển sang
                trang chi tiết nhân sự của chính bạn để tránh hiển thị dashboard tổng hợp của admin.
              </p>
            </div>

            <div className="grid gap-3 rounded-[1.25rem] border border-primary/15 bg-bg-surface/80 p-4 backdrop-blur">
              <div className="rounded-xl border border-border-default bg-bg-secondary/35 p-3">
                <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
                  Điều hướng
                </p>
                <div className="mt-2 h-2 w-28 animate-pulse rounded-full bg-primary/20" />
              </div>
              <div className="rounded-xl border border-border-default bg-bg-secondary/35 p-3">
                <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
                  Đang chuyển
                </p>
                <div className="mt-2 h-2 w-36 animate-pulse rounded-full bg-primary/20" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ProfileGateLoadingState() {
  return (
    <div className="min-h-full bg-bg-primary p-4 sm:p-6" aria-busy="true" aria-live="polite">
      <div className="mx-auto w-full max-w-[1320px] space-y-4">
        <Skeleton className="h-28 rounded-[1.75rem]" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardTabPage() {
  const { push } = useRouter();
  const pathname = usePathname();
  const routeBase = resolveAdminLikeRouteBase(pathname);
  const quickViewYearLabelId = useId();

  const fullProfileQuery = useQuery({
    queryKey: ["auth", "full-profile"],
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });
  const profileData = fullProfileQuery.data;

  const isAssistantStaff =
    profileData?.roleType === "staff" &&
    (profileData.staffInfo?.roles ?? []).includes("assistant");
  const assistantStaffId = profileData?.staffInfo?.id ?? "";

  const defaultPeriod = useMemo(() => {
    const now = new Date();
    return {
      month: String(now.getMonth() + 1).padStart(2, "0"),
      year: String(now.getFullYear()),
    };
  }, []);
  const [month, setMonth] = useState(defaultPeriod.month);
  const [year, setYear] = useState(defaultPeriod.year);
  const [quickView, setQuickView] = useState<QuickViewKey>("finance");
  const [selectedFinancialRowKey, setSelectedFinancialRowKey] = useState<AdminDashboardFinancialDetailRowKey | null>(null);
  const [openAlertGroup, setOpenAlertGroup] = useState<{
    group: AdminDashboardActionAlertGroup;
    title: string;
    tone: AlertGroupTone;
  } | null>(null);

  // Date-range mode state
  const [viewMode, setViewMode] = useState<"month" | "range">("month");
  const defaultDateRange = useMemo(() => {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 29);
    const from = fromDate.toISOString().slice(0, 10);
    return { from, to };
  }, []);
  const [dateFrom, setDateFrom] = useState(defaultDateRange.from);
  const [dateTo, setDateTo] = useState(defaultDateRange.to);

  const isRangeMode = viewMode === "range";

  const dashboardQuery = useQuery<AdminDashboardDto>({
    queryKey: ["dashboard", "admin", year, month],
    queryFn: () =>
      getAdminDashboard({
        month,
        year,
        alertLimit: 8,
        topClassLimit: 8,
      }),
    enabled: fullProfileQuery.isSuccess && !isAssistantStaff,
    staleTime: 30_000,
  });

  // Second query for range mode financial data (only financial rows; KPI/alerts/quickview stay on month query)
  const rangeFinancialQuery = useQuery<AdminDashboardDto>({
    queryKey: ["dashboard", "admin", "range", dateFrom, dateTo],
    queryFn: () =>
      getAdminDashboard({
        dateFrom,
        dateTo,
        alertLimit: 1,
        topClassLimit: 1,
      }),
    enabled: fullProfileQuery.isSuccess && !isAssistantStaff && isRangeMode,
    staleTime: 30_000,
  });

  const financialDetailQuery = useQuery({
    queryKey: [
      "dashboard", "admin", "financial-detail", selectedFinancialRowKey,
      isRangeMode ? dateFrom : year,
      isRangeMode ? dateTo : month,
    ],
    queryFn: () =>
      isRangeMode
        ? getAdminDashboardFinancialDetail({
            rowKey: selectedFinancialRowKey!,
            dateFrom,
            dateTo,
            limit: 500,
          })
        : getAdminDashboardFinancialDetail({
            rowKey: selectedFinancialRowKey!,
            month,
            year,
            limit: 500,
          }),
    enabled: fullProfileQuery.isSuccess && !isAssistantStaff && selectedFinancialRowKey != null,
    staleTime: 20_000,
  });

  if (fullProfileQuery.isLoading) return <ProfileGateLoadingState />;

  if (isAssistantStaff) {
    return <AssistantDashboardRedirect staffId={assistantStaffId} />;
  }

  if (fullProfileQuery.isError) {
    return (
      <div className="min-h-full bg-bg-primary p-4 sm:p-6">
        <div className="mx-auto w-full max-w-[960px]">
          <Alert variant="destructive">
            <DashboardIcon path="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            <AlertTitle>Không xác nhận được hồ sơ truy cập</AlertTitle>
            <AlertDescription>
              Không tải được hồ sơ người dùng để xác định quyền dashboard.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (dashboardQuery.isLoading) return <DashboardLoadingState />;

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <div className="min-h-full bg-bg-primary p-4 sm:p-6">
        <div className="mx-auto w-full max-w-[960px]">
          <Alert variant="destructive">
            <DashboardIcon path="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            <AlertTitle>Dashboard chưa tải được dữ liệu</AlertTitle>
            <AlertDescription>{getErrorMessage(dashboardQuery.error)}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const dashboard = dashboardQuery.data;
  const yearOptions = Array.from({ length: 4 }).map((_, index) => {
    const y = String(Number(defaultPeriod.year) - index);
    return { value: y, label: y };
  });

  // In range mode: financial table + popup use range query data; everything else uses main month query
  const activeFinancialDashboard =
    isRangeMode && rangeFinancialQuery.data ? rangeFinancialQuery.data : dashboard;

  const teacherCost = getBreakdownAmount(activeFinancialDashboard, "teacherCost");
  const customerCareCost = getBreakdownAmount(activeFinancialDashboard, "customerCareCost");
  const lessonCost = getBreakdownAmount(activeFinancialDashboard, "lessonCost");
  const bonusCost = getBreakdownAmount(activeFinancialDashboard, "bonusCost");
  const extraAllowanceCost = getBreakdownAmount(activeFinancialDashboard, "extraAllowanceCost");
  const operatingCost = getBreakdownAmount(activeFinancialDashboard, "operatingCost");
  const personnelCostMonthly =
    teacherCost + customerCareCost + lessonCost + bonusCost;
  const otherCostMonthly = operatingCost + extraAllowanceCost;
  const totalReceiveNet =
    (activeFinancialDashboard?.summary.monthlyTopupTotal ?? 0) - personnelCostMonthly - otherCostMonthly;

  const financialPeriodLabel = isRangeMode
    ? (rangeFinancialQuery.data?.period.monthLabel ?? `${dateFrom} – ${dateTo}`)
    : (dashboard?.period.monthLabel ?? "");

  const payrollNoteDetail = `Gia sư: ${formatCurrency(teacherCost)} - Giáo án: ${formatCurrency(lessonCost)} - SALE&CSKH: ${formatCurrency(customerCareCost)} - Thưởng: ${formatCurrency(bonusCost)}`;

  const financialSummaryRows: FinancialSummaryRow[] = [
    {
      key: "topup",
      label: "Tổng nạp (Dòng tiền vào)",
      value: activeFinancialDashboard?.summary.monthlyTopupTotal ?? 0,
      note: "Tổng số tiền thực tế phụ huynh/học sinh đã nạp vào ví trong kỳ đang xem. Phản ánh dòng tiền mặt thực thu.",
    },
    {
      key: "revenue",
      label: "Học phí đã học (Doanh thu)",
      value: activeFinancialDashboard?.summary.totalLearnedTuition ?? 0,
      note: `Học phí tương ứng với các buổi học thực tế học sinh đã tham gia (hoặc vắng có phép) trong kỳ đang xem. Đây là doanh thu thực tế được ghi nhận.`,
    },
    {
      key: "prepaid",
      label: "Học phí chưa dạy (Ví dương)",
      value: activeFinancialDashboard?.summary.prepaidTuitionTotal ?? 0,
      note: "Tổng số dư ví còn dương của những học sinh có đi học trong kỳ đang xem. Đây là học phí học viên đóng trước nhưng trung tâm chưa dạy (chưa tính vào doanh thu).",
    },
    {
      key: "uncollected",
      label: "Học phí chưa thu (Ví âm)",
      value: activeFinancialDashboard?.summary.pendingCollectionTotal ?? 0,
      note: "Tổng số tiền học sinh còn nợ (ví âm) có phát sinh buổi học trong kỳ đang xem. Cần liên hệ phụ huynh để thu hồi.",
    },
    {
      key: "pending-payroll",
      label: "Trợ cấp chờ thanh toán",
      value: activeFinancialDashboard?.summary.pendingPayrollTotal ?? 0,
      note: `${payrollNoteDetail} · Các khoản phát sinh trong kỳ nhưng chưa chi trả thực tế cho nhân sự.`,
    },
    {
      key: "personnel-cost",
      label: "Chi phí Nhân sự",
      value: personnelCostMonthly,
      note: "Tổng chi phí trợ cấp nhân sự phát sinh trong kỳ (bao gồm giảng dạy, giáo án, CSKH và thưởng).",
    },
    {
      key: "other-cost",
      label: "Chi phí Khác",
      value: otherCostMonthly,
      note: "Các chi phí vận hành khác phát sinh trong kỳ như chi phí học thử, marketing, và chi phí văn phòng.",
    },
    {
      key: "profit",
      label: "Lợi nhuận thực tế (Kế toán)",
      value: activeFinancialDashboard?.summary.monthlyProfit ?? 0,
      note: "Lợi nhuận tính trên doanh thu thực tế (Học phí đã học - Chi phí nhân sự - Chi phí khác). Phản ánh hiệu quả hoạt động giảng dạy.",
      emphasize: true,
    },
    {
      key: "total-in",
      label: "Dòng tiền thuần (Thực thu ròng)",
      value: totalReceiveNet,
      note: "Chênh lệch dòng tiền mặt thực tế thu chi trong kỳ (Tổng nạp - Chi phí nhân sự - Chi phí khác). Phản ánh lượng tiền mặt tăng thêm ròng.",
      emphasize: true,
    },
  ];

  const financialCsvRows = financialSummaryRows.map((row) => ({
    label: row.label,
    value: formatCurrency(row.value),
    note: row.note,
  }));
  const selectedFinancialRow = selectedFinancialRowKey
    ? financialSummaryRows.find((row) => row.key === selectedFinancialRowKey) ?? null
    : null;
  const yearlyRevenueTotal = dashboard.yearlySummary.reduce((sum, item) => sum + item.revenue, 0);
  const yearlyExpenseTotal = dashboard.yearlySummary.reduce((sum, item) => sum + item.expense, 0);
  const yearlyProfitTotal = dashboard.yearlySummary.reduce((sum, item) => sum + item.profit, 0);
  const bestQuarter =
    dashboard.yearlySummary.reduce((best, item) => (item.profit > best.profit ? item : best), dashboard.yearlySummary[0]) ??
    { quarter: "Q1", classes: 0, revenue: 0, expense: 0, profit: 0 };

  const expiringAlerts = dashboard.actionAlerts.filter((item) => item.type === "Sắp hết tiền");
  const debtAlerts = dashboard.actionAlerts.filter((item) => item.type === "Chưa thu");
  const payrollAlerts = dashboard.actionAlerts.filter((item) => item.type === "Nhân sự chưa thanh toán");
  const classAlerts = dashboard.actionAlerts.filter((item) => item.type === "Lớp cảnh báo");

  const alertGroupCards: Array<{
    group: AdminDashboardActionAlertGroup;
    title: string;
    alerts: AdminDashboardActionAlert[];
    totalCount: number;
    tone: AlertGroupTone;
  }> = [
    {
      group: "expiring",
      title: "Học sinh cần gia hạn",
      alerts: expiringAlerts,
      totalCount: dashboard.summary.expiringStudentsCount,
      tone: "destructive",
    },
    {
      group: "payroll",
      title: "Chờ thanh toán trợ cấp",
      alerts: payrollAlerts,
      totalCount: dashboard.summary.unpaidStaffCount,
      tone: "info",
    },
    {
      group: "class",
      title: `Lớp chưa báo cáo lần ${dashboard.summary.currentSurveyRound}`,
      alerts: classAlerts,
      totalCount: dashboard.summary.classAlertCount,
      tone: "class",
    },
    {
      group: "debt",
      title: "Chưa thu học phí",
      alerts: debtAlerts,
      totalCount: dashboard.summary.debtStudentsCount,
      tone: "warning",
    },
  ];

  const openAlertDetail = (alert: AdminDashboardActionAlert) => {
    if (alert.targetType === "student") {
      push(buildAdminLikePath(routeBase, `students/${alert.targetId}`));
      return;
    }
    if (alert.targetType === "staff") {
      push(buildAdminLikePath(routeBase, `staffs/${alert.targetId}`));
      return;
    }
    push(buildAdminLikePath(routeBase, `classes/${alert.targetId}`));
  };

  const openFinancialDetail = (rowKey: AdminDashboardFinancialDetailRowKey) => {
    setSelectedFinancialRowKey(rowKey);
  };

  const renderFinancialValue = (
    row: FinancialSummaryRow,
    className: string,
  ) => {
    return (
      <button
        type="button"
        onClick={() => openFinancialDetail(row.key)}
        className={className}
        aria-label={`Mở chi tiết ${row.label}`}
      >
        {formatCurrency(row.value)}
      </button>
    );
  };

  const quickCards =
    quickView === "finance"
      ? [
        {
          label: "Tổng doanh thu năm",
          value: formatCurrency(yearlyRevenueTotal),
          description: `Tổng học phí đã học thực tế (doanh thu) tích lũy trong năm ${year}.`,
        },
        {
          label: "Tổng chi phí năm",
          value: formatCurrency(yearlyExpenseTotal),
          description: `Tổng chi phí nhân sự và vận hành đã ghi nhận tích lũy trong năm ${year}.`,
        },
        {
          label: "Lợi nhuận ròng năm",
          value: formatCurrency(yearlyProfitTotal),
          description: `Tổng doanh thu trừ chi phí tích lũy trong năm ${year}.`,
        },
        {
          label: "Quý hiệu quả nhất",
          value: bestQuarter.quarter,
          description: `Quý đạt lợi nhuận ròng cao nhất trong năm ${year} (${formatCurrency(bestQuarter.profit)}).`,
        },
      ]
      : quickView === "ops"
        ? [
          { label: "Lớp đang hoạt động", value: String(dashboard.summary.activeClasses), description: "Số lớp đang chạy" },
          { label: "Cảnh báo mở", value: String(dashboard.summary.totalAlerts), description: "Tổng cảnh báo cần xử lý" },
          { label: "Nhân sự chưa thanh toán", value: String(dashboard.summary.unpaidStaffCount), description: "Nhân sự còn khoản pending" },
          { label: "Trợ cấp chờ thanh toán", value: formatCurrency(dashboard.summary.pendingPayrollTotal), description: "Tổng payroll pending" },
        ]
        : [
          { label: "Học sinh active", value: String(dashboard.summary.activeStudents), description: "Học sinh thuộc lớp running" },
          { label: "Học sinh gần hết tiền", value: String(dashboard.summary.expiringStudentsCount), description: "Cần follow-up sớm" },
          { label: "Học sinh nợ học phí", value: String(dashboard.summary.debtStudentsCount), description: "Đang âm ví" },
          { label: "Tổng nợ học phí", value: formatCurrency(dashboard.summary.pendingCollectionTotal), description: "Tổng nợ hiện tại" },
        ];

  return (
    <div className="min-h-full bg-bg-primary p-4 sm:p-6">
      <div className="mx-auto w-full max-w-[1320px] space-y-4 rounded-xl border border-border-default bg-bg-surface p-4 sm:p-5">
        <section className="flex flex-col gap-3 border-b border-border-default pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-xs text-text-muted">Bộ lọc theo thời gian</span>

              {/* Mode toggle */}
              <div className="inline-flex w-fit rounded-md border border-border-default bg-bg-secondary p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("month")}
                  className={`inline-flex items-center rounded px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                    viewMode === "month"
                      ? "bg-bg-surface text-text-primary shadow-sm"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Theo tháng
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("range")}
                  className={`inline-flex items-center rounded px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                    viewMode === "range"
                      ? "bg-bg-surface text-text-primary shadow-sm"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Khoảng ngày
                </button>
              </div>

              {/* Month navigator (month mode) */}
              {viewMode === "month" && (
                <div className="inline-flex w-fit items-center gap-2 rounded-md border border-border-default bg-bg-surface p-1">
                  <button
                    type="button"
                    onClick={() => {
                      const next = stepMonth(month, year, -1);
                      setMonth(next.month);
                      setYear(next.year);
                    }}
                    className="inline-flex min-h-8 min-w-8 items-center justify-center rounded border border-border-default bg-bg-surface text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    aria-label="Tháng trước"
                    title="Tháng trước"
                  >
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="min-w-[150px] rounded border border-border-default px-3 py-1.5 text-center text-sm font-medium text-text-primary">
                    {formatMonthPartsLabel(month, year)}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = stepMonth(month, year, 1);
                      setMonth(next.month);
                      setYear(next.year);
                    }}
                    className="inline-flex min-h-8 min-w-8 items-center justify-center rounded border border-border-default bg-bg-surface text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    aria-label="Tháng sau"
                    title="Tháng sau"
                  >
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Date range picker (range mode) */}
              {viewMode === "range" && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor="dateFrom" className="text-xs text-text-muted whitespace-nowrap">Từ ngày</label>
                    <DateInput
                      id="dateFrom"
                      value={dateFrom}
                      max={dateTo}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="rounded-md border border-border-default bg-bg-surface px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="dateTo" className="text-xs text-text-muted whitespace-nowrap">Đến ngày</label>
                    <DateInput
                      id="dateTo"
                      value={dateTo}
                      min={dateFrom}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="rounded-md border border-border-default bg-bg-surface px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    />
                  </div>
                  {rangeFinancialQuery.isFetching && (
                    <span className="text-xs text-text-muted animate-pulse">Đang tải…</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-10 items-center rounded-md border border-border-default bg-bg-surface px-3 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                Xuất PDF
              </button>
              <button
                type="button"
                onClick={() => exportCsv(isRangeMode ? `dashboard-${dateFrom}-${dateTo}.csv` : `dashboard-${year}-${month}.csv`, financialCsvRows)}
                className="inline-flex min-h-10 items-center rounded-md bg-primary px-3 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                Xuất Excel
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard title="Lớp học" value={String(dashboard.summary.activeClasses)} note={`${dashboard.summary.activeClasses} đang hoạt động`} tone="primary" />
          <KpiCard title="Học sinh" value={String(dashboard.summary.activeStudents)} note={`${dashboard.summary.activeStudents} đang học`} tone="default" />
          <KpiCard
            title="Lợi nhuận tháng"
            value={formatCurrency(activeFinancialDashboard?.summary.monthlyProfit ?? 0)}
            note="Doanh thu thực tế (học phí đã học) trừ chi phí"
            tone={(activeFinancialDashboard?.summary.monthlyProfit ?? 0) >= 0 ? "success" : "warning"}
            onClick={() => setSelectedFinancialRowKey("profit")}
          />
          <KpiCard
            title="Học phí chưa dạy (Ví dương)"
            value={formatCurrency(activeFinancialDashboard?.summary.prepaidTuitionTotal ?? 0)}
            note="Ví dương của học sinh có phát sinh buổi học trong kỳ"
            tone="warning"
            onClick={() => setSelectedFinancialRowKey("prepaid")}
          />
          <KpiCard
            title="Học phí chưa thu (Ví âm)"
            value={formatCurrency(activeFinancialDashboard?.summary.pendingCollectionTotal ?? 0)}
            note="Ví âm của học sinh có phát sinh buổi học trong kỳ"
            tone="default"
            onClick={() => setSelectedFinancialRowKey("uncollected")}
          />
          <KpiCard
            title="Trợ cấp chờ thanh toán"
            value={String(dashboard.summary.unpaidStaffCount)}
            note={`${dashboard.summary.unpaidStaffCount} nhân sự chưa thanh toán trợ cấp`}
            tone="warning"
            onClick={() => setSelectedFinancialRowKey("pending-payroll")}
          />
        </section>

        <section className="overflow-hidden rounded-xl border border-border-default bg-bg-surface shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 sm:px-6 sm:py-5">
            <h2 className="text-base font-bold tracking-tight text-text-primary sm:text-lg">
              Báo cáo tài chính
            </h2>
            {isRangeMode && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary">
                <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {rangeFinancialQuery.isFetching ? "Đang tải khoảng ngày…" : financialPeriodLabel}
              </span>
            )}
          </div>

          <div className="space-y-3 border-t border-border-default p-4 md:hidden">
            {financialSummaryRows.map((row) => (
              <article
                key={row.key}
                className={`rounded-xl border px-4 py-3 shadow-sm ${
                  row.emphasize
                    ? "border-primary/15 bg-primary/5"
                    : "border-border-default bg-bg-surface"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                      Danh mục
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">
                      {row.label}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                      Giá trị
                    </p>
                    <div className="mt-1">
                      {renderFinancialValue(
                        row,
                        "text-right text-base font-semibold tabular-nums text-primary underline-offset-2 transition-colors hover:text-primary-hover hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 border-t border-border-default/70 pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Ghi chú
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    {row.note}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto border-t border-border-default md:block">
            <Table>
              <TableCaption className="sr-only">
                Báo cáo tài chính theo tháng đang xem. Nhấp giá trị màu xanh ở từng dòng để xem popup chi tiết số tiền
                và các nguồn cộng trừ liên quan.
              </TableCaption>
              <TableHeader>
                <TableRow className="border-border-default hover:bg-transparent">
                  <TableHead className="h-auto min-w-[200px] py-3.5 pl-5 text-left text-xs font-semibold uppercase tracking-[0.14em] text-text-muted sm:pl-6">
                    Danh mục
                  </TableHead>
                  <TableHead className="h-auto min-w-[140px] py-3.5 text-left text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                    Giá trị
                  </TableHead>
                  <TableHead className="h-auto min-w-[260px] py-3.5 pr-5 text-left text-xs font-semibold uppercase tracking-[0.14em] text-text-muted sm:pr-6">
                    Ghi chú
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financialSummaryRows.map((row) => (
                  <TableRow
                    key={row.key}
                    className={`border-border-default/80 hover:bg-bg-secondary/25 ${row.emphasize ? "bg-bg-secondary/35" : ""}`}
                  >
                    <TableCell className="py-4 pl-5 align-top sm:pl-6">
                      <p className="text-sm font-semibold text-text-primary">{row.label}</p>
                    </TableCell>
                    <TableCell className="py-4 align-top">
                      {renderFinancialValue(
                        row,
                          "text-left text-sm font-semibold tabular-nums text-primary underline-offset-2 transition-colors hover:text-primary-hover hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal py-4 pr-5 align-top text-sm leading-relaxed text-text-muted sm:pr-6">
                      {row.note}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="rounded-xl border border-border-default bg-bg-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <DashboardIcon path="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            <h2 className="text-base font-semibold text-text-primary">Cảnh báo & hành động</h2>
                    </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {alertGroupCards.map((card) => (
              <AlertGroupCard
                key={card.group}
                title={card.title}
                alerts={card.alerts}
                totalCount={card.totalCount}
                tone={card.tone}
                onOpenAlert={openAlertDetail}
                onViewAll={() =>
                  setOpenAlertGroup({
                    group: card.group,
                    title: card.title,
                    tone: card.tone,
                  })
                }
              />
            ))}
                  </div>
        </section>

        <section className="rounded-xl border border-border-default bg-bg-surface p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-text-primary">Chế độ xem nhanh theo phân hệ</h2>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span id={quickViewYearLabelId}>Năm</span>
              <div className="w-[120px]">
                <UpgradedSelect
                  labelId={quickViewYearLabelId}
                  value={year}
                  onValueChange={setYear}
                  options={yearOptions}
                  buttonClassName="min-h-9 rounded-md border border-border-default bg-bg-surface px-2.5 py-2 text-sm text-text-primary shadow-none transition-colors duration-200 hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          menuClassName="overflow-auto rounded-xl border border-border-default bg-bg-surface p-1 shadow-[0_18px_40px_-24px_color-mix(in_srgb,var(--ue-text-primary)_24%,transparent)]"
                />
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {[
              { key: "finance" as const, label: "Tài chính" },
              { key: "ops" as const, label: "Vận hành" },
              { key: "students" as const, label: "Học viên" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setQuickView(item.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${quickView === item.key
                  ? "bg-primary text-text-inverse"
                  : "border border-border-default bg-bg-surface text-text-secondary hover:bg-bg-secondary"
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {quickCards.map((card) => (
              <QuickViewCard key={card.label} label={card.label} value={card.value} description={card.description} />
                ))}
              </div>
        </section>

        {selectedFinancialRow ? (
          <FinancialDetailModal
            rowLabel={selectedFinancialRow.label}
            detail={financialDetailQuery.data}
            isLoading={financialDetailQuery.isLoading}
            error={financialDetailQuery.error}
            onClose={() => setSelectedFinancialRowKey(null)}
          />
        ) : null}

        {openAlertGroup ? (
          <DashboardAlertListDialog
            open
            title={openAlertGroup.title}
            group={openAlertGroup.group}
            tone={openAlertGroup.tone}
            month={month}
            year={year}
            onClose={() => setOpenAlertGroup(null)}
            onOpenAlert={openAlertDetail}
          />
        ) : null}

      </div>
    </div>
  );
}
