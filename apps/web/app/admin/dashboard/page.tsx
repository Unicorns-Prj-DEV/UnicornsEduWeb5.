"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getAdminDashboard,
  getAdminStudentBalanceDetails,
  getAdminTopupHistory,
} from "@/lib/apis/dashboard.api";
import type {
  AdminDashboardActionAlert,
  AdminDashboardDto,
  AdminDashboardStudentBalanceItem,
  AdminDashboardTopupHistoryItem,
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
}: {
  title: string;
  value: string;
  note: string;
  tone: "primary" | "success" | "warning" | "default";
}) {
  const accent =
    tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : tone === "primary" ? "bg-primary" : "bg-border-focus";
  return (
    <div className="relative rounded-lg border border-border-default bg-bg-surface p-4">
      <span className={`absolute bottom-0 left-0 top-0 w-1 rounded-l-lg ${accent}`} aria-hidden />
      <p className="pl-2 text-xs text-text-muted">{title}</p>
      <p className="pl-2 pt-2 text-3xl font-semibold tabular-nums text-text-primary">{value}</p>
      <p className="pl-2 pt-1 text-sm text-text-secondary">{note}</p>
    </div>
  );
}

function AlertGroupCard({
  title,
  alerts,
  tone,
  onOpenAlert,
}: {
  title: string;
  alerts: AdminDashboardActionAlert[];
  tone: "warning" | "destructive" | "info" | "class";
  onOpenAlert: (alert: AdminDashboardActionAlert) => void;
}) {
  const toneClass =
    tone === "warning"
      ? "border-warning/35"
      : tone === "destructive"
        ? "border-error/35"
        : tone === "info"
          ? "border-info/35"
          : "border-error/25";
  const headerClass =
    tone === "warning"
      ? "bg-warning/10 text-warning"
      : tone === "destructive"
        ? "bg-error/10 text-error"
        : tone === "info"
          ? "bg-info/10 text-info"
          : "bg-error/8 text-error";
  const toneDotClass =
    tone === "warning"
      ? "bg-warning"
      : tone === "destructive"
        ? "bg-error"
        : tone === "info"
          ? "bg-info"
          : "bg-error";
  const itemToneClass =
    tone === "warning"
      ? "border-warning/25 bg-warning/5 hover:bg-warning/10"
      : tone === "destructive"
        ? "border-error/25 bg-error/5 hover:bg-error/10"
        : tone === "info"
          ? "border-info/25 bg-info/5 hover:bg-info/10"
          : "border-error/20 bg-error/5 hover:bg-error/10";
  return (
    <article className={`rounded-xl border bg-bg-surface p-2.5 ${toneClass}`}>
      <div className={`mb-2 rounded-md border px-2.5 py-2 ${headerClass}`}>
        <div className="flex items-start gap-2">
          <span className={`mt-1 inline-flex size-2 rounded-full ${toneDotClass}`} aria-hidden />
          <div>
            <p className="text-sm font-semibold leading-5">{title}</p>
            <p className="mt-0.5 text-xs opacity-80">{alerts.length} mục</p>
          </div>
        </div>
      </div>
      <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
        {alerts.length > 0 ? (
          alerts.slice(0, 5).map((item) => (
            <button
              key={`${title}-${item.targetId}-${item.subject}`}
              type="button"
              onClick={() => onOpenAlert(item)}
              className={`w-full rounded-md border px-2 py-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${itemToneClass}`}
              title="Mở chi tiết"
            >
              <p className="line-clamp-2 text-xs font-semibold text-text-primary">{item.subject}</p>
              <p className="mt-0.5 text-[11px] text-text-secondary">{item.owner ?? item.due}</p>
              <p className="mt-0.5 text-[11px] font-medium text-text-primary">{formatCurrency(item.amount)}</p>
            </button>
          ))
        ) : (
          <div className="rounded-md bg-bg-secondary/45 px-2 py-2 text-xs text-text-muted">Không có mục cần xử lý.</div>
        )}
      </div>
    </article>
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

function monthLabel(month: string, year: string) {
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
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

function DashboardLoadingState() {
  return (
    <div className="min-h-full bg-bg-primary p-4 sm:p-6">
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

export default function AdminDashboardTabPage() {
  const router = useRouter();
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
  const [isTopupHistoryOpen, setIsTopupHistoryOpen] = useState(false);
  const [isStudentBalanceOpen, setIsStudentBalanceOpen] = useState(false);

  const dashboardQuery = useQuery<AdminDashboardDto>({
    queryKey: ["dashboard", "admin", year, month],
    queryFn: () =>
      getAdminDashboard({
        month,
        year,
        alertLimit: 12,
        topClassLimit: 8,
      }),
    staleTime: 30_000,
  });

  const topupHistoryQuery = useQuery<AdminDashboardTopupHistoryItem[]>({
    queryKey: ["dashboard", "admin", "topup-history", year, month],
    queryFn: () => getAdminTopupHistory({ month, year, limit: 150 }),
    enabled: isTopupHistoryOpen,
    staleTime: 20_000,
  });

  const studentBalanceQuery = useQuery<AdminDashboardStudentBalanceItem[]>({
    queryKey: ["dashboard", "admin", "student-balance-details"],
    queryFn: () => getAdminStudentBalanceDetails({ limit: 300 }),
    enabled: isStudentBalanceOpen,
    staleTime: 20_000,
  });

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

  const teacherCost = getBreakdownAmount(dashboard, "teacherCost");
  const customerCareCost = getBreakdownAmount(dashboard, "customerCareCost");
  const lessonCost = getBreakdownAmount(dashboard, "lessonCost");
  const bonusCost = getBreakdownAmount(dashboard, "bonusCost");
  const extraAllowanceCost = getBreakdownAmount(dashboard, "extraAllowanceCost");
  const operatingCost = getBreakdownAmount(dashboard, "operatingCost");
  const payrollTotal = teacherCost + customerCareCost + lessonCost + bonusCost + extraAllowanceCost;

  const financialRows = [
    { label: "Tổng nạp", value: formatCurrency(dashboard.summary.monthlyRevenue), note: "Tổng số tiền học sinh đã nạp" },
    { label: "Học phí đã học", value: formatCurrency(dashboard.summary.monthlyRevenue), note: "Tổng học phí các buổi đã học" },
    { label: "Nợ học phí chưa dạy", value: formatCurrency(dashboard.summary.pendingCollectionTotal), note: "Tổng số dư hiện tại của tất cả học sinh" },
    { label: "Chưa thu", value: formatCurrency(dashboard.summary.pendingCollectionTotal), note: "Tổng nợ học phí của học sinh" },
    {
      label: "Chờ Thanh Toán Trợ Cấp",
      value: formatCurrency(dashboard.summary.pendingPayrollTotal),
      note: `Gia sư: ${formatCurrency(teacherCost)} • Giáo án: ${formatCurrency(lessonCost)} • SALE&CSKH: ${formatCurrency(customerCareCost)} • Thưởng: ${formatCurrency(bonusCost)}`,
    },
    {
      label: "Chi phí Nhân Sự",
      value: formatCurrency(payrollTotal),
      note: `Gia sư: ${formatCurrency(teacherCost)} • Giáo án: ${formatCurrency(lessonCost)} • SALE&CSKH: ${formatCurrency(customerCareCost)} • Thưởng: ${formatCurrency(bonusCost + extraAllowanceCost)}`,
    },
    { label: "Chi phí Khác", value: formatCurrency(operatingCost), note: "Nguyên học thử, marketing, vận hành khác" },
    { label: "Lợi nhuận", value: formatCurrency(dashboard.summary.monthlyProfit), note: "Học phí đã học - Chi phí nhân sự - Chi phí khác" },
    {
      label: "Tổng nhận",
      value: formatCurrency(dashboard.summary.monthlyRevenue - payrollTotal - operatingCost),
      note: "Tổng nạp - Chi phí nhân sự - Chi phí khác",
    },
  ];

  const expiringAlerts = dashboard.actionAlerts.filter((item) => item.type === "Sắp hết tiền");
  const debtAlerts = dashboard.actionAlerts.filter((item) => item.type === "Chưa thu");
  const payrollAlerts = dashboard.actionAlerts.filter((item) => item.type === "Nhân sự chưa thanh toán");
  const classAlerts = dashboard.actionAlerts.filter((item) => item.type === "Lớp cảnh báo");

  const openAlertDetail = (alert: AdminDashboardActionAlert) => {
    if (alert.targetType === "student") {
      router.push(`/admin/students/${alert.targetId}`);
      return;
    }
    if (alert.targetType === "staff") {
      router.push(`/admin/staffs/${alert.targetId}`);
      return;
    }
    router.push(`/admin/classes/${alert.targetId}`);
  };

  const quickCards =
    quickView === "finance"
      ? [
          {
            label: "Tổng doanh thu",
            value: formatCurrency(dashboard.yearlySummary.reduce((sum, item) => sum + item.revenue, 0)),
            description: "Tổng hợp phí đã học các tháng trong năm",
          },
          {
            label: "Chi phí gia sư",
            value: formatCurrency(dashboard.yearlySummary.reduce((sum, item) => sum + item.expense, 0)),
            description: "Payroll theo dữ liệu annual summary",
          },
          { label: "Chi phí khác", value: formatCurrency(operatingCost), description: "Marketing, vận hành và các khoản khác" },
          {
            label: "Lợi nhuận ròng",
            value: formatCurrency(dashboard.yearlySummary.reduce((sum, item) => sum + item.profit, 0)),
            description: "Doanh thu - Chi phí",
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
        <section className="flex flex-col gap-3 border-b border-border-default pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-text-muted">Bộ lọc theo thời gian</span>
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
                {monthLabel(month, year)}
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
              onClick={() => exportCsv(`dashboard-${year}-${month}.csv`, financialRows)}
              className="inline-flex min-h-10 items-center rounded-md bg-primary px-3 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Xuất Excel
            </button>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard title="Lớp học" value={String(dashboard.summary.activeClasses)} note={`${dashboard.summary.activeClasses} đang hoạt động`} tone="primary" />
          <KpiCard title="Học sinh" value={String(dashboard.summary.activeStudents)} note={`${dashboard.summary.activeStudents} đang học`} tone="default" />
          <KpiCard title="Giáo viên" value={String(dashboard.summary.unpaidStaffCount)} note="Đang hợp tác" tone="success" />
          <KpiCard
            title="Số tiền lãi"
            value={formatCurrency(dashboard.summary.monthlyProfit)}
            note="Học phí đã học - Chi phí phụ cấp"
            tone={dashboard.summary.monthlyProfit >= 0 ? "success" : "warning"}
          />
          <KpiCard
            title="Nợ học phí chưa dạy"
            value={formatCurrency(dashboard.summary.pendingCollectionTotal)}
            note="Tổng số dư hiện tại của tất cả học sinh"
            tone="warning"
          />
          <KpiCard
            title="Chưa thu"
            value={formatCurrency(dashboard.summary.pendingCollectionTotal)}
            note="Tổng nợ học phí của học sinh"
            tone="default"
          />
        </section>

        <section className="rounded-xl border border-border-default bg-bg-surface">
          <div className="border-b border-border-default px-4 py-3">
            <h2 className="text-base font-semibold text-text-primary">Báo cáo tài chính</h2>
          </div>
          <div className="overflow-x-auto px-2 py-2 sm:px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Giá trị</TableHead>
                  <TableHead>Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financialRows.map((row) => (
                  <TableRow
                    key={row.label}
                    className={
                      row.label === "Chờ Thanh Toán Trợ Cấp" || row.label === "Chi phí Nhân Sự"
                        ? "bg-bg-secondary/45"
                        : undefined
                    }
                  >
                    <TableCell className="font-medium text-text-primary">{row.label}</TableCell>
                    <TableCell className="font-semibold tabular-nums text-text-primary">
                      {row.label === "Tổng nạp" || row.label === "Nợ học phí chưa dạy" ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (row.label === "Tổng nạp") {
                              setIsTopupHistoryOpen(true);
                              return;
                            }
                            setIsStudentBalanceOpen(true);
                          }}
                          className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          {row.value}
                        </button>
                      ) : (
                        row.value
                      )}
                    </TableCell>
                    <TableCell className="text-text-secondary">{row.note}</TableCell>
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
            <AlertGroupCard
              title="Học sinh cần gia hạn"
              alerts={expiringAlerts}
              tone="destructive"
              onOpenAlert={openAlertDetail}
            />
            <AlertGroupCard
              title="Chờ thanh toán trợ cấp"
              alerts={payrollAlerts}
              tone="info"
              onOpenAlert={openAlertDetail}
            />
            <AlertGroupCard
              title="Lớp chưa báo cáo lần 4"
              alerts={classAlerts}
              tone="class"
              onOpenAlert={openAlertDetail}
            />
            <AlertGroupCard
              title="Chưa thu học phí"
              alerts={debtAlerts}
              tone="warning"
              onOpenAlert={openAlertDetail}
            />
          </div>
        </section>

        <section className="rounded-xl border border-border-default bg-bg-surface p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-text-primary">Chế độ xem nhanh theo phân hệ</h2>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <span>Năm</span>
              <select
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="min-h-9 rounded-md border border-border-default bg-bg-surface px-2.5 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {yearOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
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
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                  quickView === item.key
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

        {isTopupHistoryOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
              aria-hidden
              onClick={() => setIsTopupHistoryOpen(false)}
            />
            <div className="fixed inset-0 z-50 p-3 sm:p-6">
              <div className="mx-auto flex h-full w-full items-center max-w-6xl">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="dashboard-topup-history-title"
                  className="flex h-auto max-h-full w-full flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-2xl"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-border-default px-5 py-4">
                    <div>
                      <h2 id="dashboard-topup-history-title" className="text-xl font-semibold text-text-primary">
                        Lịch sử nạp
                      </h2>
                      <p className="mt-1 text-sm text-text-secondary">
                        Lịch sử nạp tiền trong kỳ đang chọn (ngày giờ - học sinh - số tiền - ghi chú - tổng nạp tích lũy toàn hệ thống).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTopupHistoryOpen(false)}
                      className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      aria-label="Đóng popup lịch sử nạp"
                    >
                      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="max-h-[72vh] overflow-auto px-4 py-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Ngày giờ</TableHead>
                          <TableHead className="whitespace-nowrap">Tên học sinh</TableHead>
                          <TableHead className="whitespace-nowrap">Số tiền nạp</TableHead>
                          <TableHead>Ghi chú</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Tổng nạp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topupHistoryQuery.isLoading ? (
                          Array.from({ length: 6 }).map((_, idx) => (
                            <TableRow key={`topup-loading-${idx}`}>
                              <TableCell colSpan={5}>
                                <Skeleton className="h-6 w-full rounded-md" />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : topupHistoryQuery.isError ? (
                          <TableRow>
                            <TableCell colSpan={5} className="py-6 text-center text-sm text-error">
                              {getErrorMessage(topupHistoryQuery.error)}
                            </TableCell>
                          </TableRow>
                        ) : topupHistoryQuery.data && topupHistoryQuery.data.length > 0 ? (
                          topupHistoryQuery.data.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="whitespace-nowrap text-text-secondary">{formatDateTime(item.dateTime)}</TableCell>
                              <TableCell className="whitespace-nowrap font-medium text-text-primary">{item.studentName}</TableCell>
                              <TableCell className="whitespace-nowrap font-semibold text-primary">{formatCurrency(item.amount)}</TableCell>
                              <TableCell className="max-w-[340px] truncate text-text-secondary" title={item.note}>
                                {item.note}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-right font-medium text-text-primary">
                                {formatCurrency(item.cumulativeBefore)} {"\u2192"} {formatCurrency(item.cumulativeAfter)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="py-8 text-center text-sm text-text-muted">
                              Chưa có giao dịch nạp trong kỳ này.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {isStudentBalanceOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
              aria-hidden
              onClick={() => setIsStudentBalanceOpen(false)}
            />
            <div className="fixed inset-0 z-50 p-3 sm:p-6">
              <div className="mx-auto flex h-full w-full items-center max-w-6xl">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="dashboard-student-balance-title"
                  className="flex h-auto max-h-full w-full flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-2xl"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-border-default px-5 py-4">
                    <div>
                      <h2 id="dashboard-student-balance-title" className="text-xl font-semibold text-text-primary">
                        Chi tiết Nợ học phí chưa dạy
                      </h2>
                      <p className="mt-1 text-sm text-text-secondary">
                        Tổng số dư hiện tại của tất cả học sinh (học sinh - lớp - số dư).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsStudentBalanceOpen(false)}
                      className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      aria-label="Đóng popup chi tiết nợ học phí chưa dạy"
                    >
                      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="max-h-[72vh] overflow-auto px-4 py-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Học sinh</TableHead>
                          <TableHead>Lớp</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Số dư</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentBalanceQuery.isLoading ? (
                          Array.from({ length: 8 }).map((_, idx) => (
                            <TableRow key={`student-balance-loading-${idx}`}>
                              <TableCell colSpan={3}>
                                <Skeleton className="h-6 w-full rounded-md" />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : studentBalanceQuery.isError ? (
                          <TableRow>
                            <TableCell colSpan={3} className="py-6 text-center text-sm text-error">
                              {getErrorMessage(studentBalanceQuery.error)}
                            </TableCell>
                          </TableRow>
                        ) : studentBalanceQuery.data && studentBalanceQuery.data.length > 0 ? (
                          studentBalanceQuery.data.map((item) => (
                            <TableRow key={item.studentId}>
                              <TableCell className="font-medium text-text-primary">{item.studentName}</TableCell>
                              <TableCell className="text-text-secondary">{item.className}</TableCell>
                              <TableCell className="text-right font-semibold tabular-nums text-warning">{formatCurrency(item.balance)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="py-8 text-center text-sm text-text-muted">
                              Chưa có dữ liệu số dư học sinh.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}

      </div>
    </div>
  );
}
