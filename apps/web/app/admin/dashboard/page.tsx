"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getAdminDashboard,
  getAdminStudentBalanceDetails,
  getAdminTopupHistory,
} from "@/lib/apis/dashboard.api";
import { getFullProfile } from "@/lib/apis/auth.api";
import {
  buildAdminLikePath,
  resolveAdminLikeRouteBase,
} from "@/lib/admin-shell-paths";
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
    <div className="relative overflow-hidden rounded-xl border border-border-default bg-bg-surface px-3 py-3 shadow-sm">
      <span className={`absolute bottom-0 left-0 top-0 w-1 ${accent}`} aria-hidden />
      <div className="pl-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">{title}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">{value}</p>
        <p className="mt-1 line-clamp-1 text-xs text-text-secondary">{note}</p>
      </div>
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
  return new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(date);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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

type FinancialRowGroup = "Dòng tiền" | "Treo & công nợ" | "Chi phí" | "Kết quả";
type FinancialRowTone = "primary" | "success" | "warning" | "danger" | "info" | "default";
type FinancialRowDrilldown = "topup-history" | "student-balance";

type FinancialRow = {
  group: FinancialRowGroup;
  label: string;
  value: number;
  note: string;
  tone: FinancialRowTone;
  emphasis?: boolean;
  drilldown?: FinancialRowDrilldown;
};

function getFinancialGroupClass(group: FinancialRowGroup) {
  switch (group) {
    case "Dòng tiền":
      return "border-primary/20 bg-primary/10 text-primary";
    case "Treo & công nợ":
      return "border-warning/25 bg-warning/10 text-warning";
    case "Chi phí":
      return "border-info/20 bg-info/10 text-info";
    case "Kết quả":
      return "border-success/20 bg-success/10 text-success";
    default:
      return "";
  }
}

function getFinancialValueClass(tone: FinancialRowTone) {
  switch (tone) {
    case "primary":
      return "text-primary";
    case "success":
      return "text-success";
    case "warning":
      return "text-warning";
    case "danger":
      return "text-error";
    case "info":
      return "text-info";
    default:
      return "text-text-primary";
  }
}

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
  const router = useRouter();
  const pathname = usePathname();
  const routeBase = resolveAdminLikeRouteBase(pathname);

  useEffect(() => {
    if (staffId) {
      router.replace(
        buildAdminLikePath(routeBase, `staffs/${encodeURIComponent(staffId)}`),
      );
      return;
    }

    router.replace("/user-profile");
  }, [routeBase, router, staffId]);

  return (
    <div className="min-h-full bg-bg-primary p-4 sm:p-6">
      <div className="mx-auto w-full max-w-[1020px]">
        <section className="overflow-hidden rounded-[1.75rem] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(18,86,104,0.12),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(246,250,252,0.94))] shadow-sm">
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
  const router = useRouter();
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
    enabled: fullProfileQuery.isSuccess && !isAssistantStaff,
    staleTime: 30_000,
  });

  const topupHistoryQuery = useQuery<AdminDashboardTopupHistoryItem[]>({
    queryKey: ["dashboard", "admin", "topup-history", year, month],
    queryFn: () => getAdminTopupHistory({ month, year, limit: 150 }),
    enabled: fullProfileQuery.isSuccess && !isAssistantStaff && isTopupHistoryOpen,
    staleTime: 20_000,
  });

  const studentBalanceQuery = useQuery<AdminDashboardStudentBalanceItem[]>({
    queryKey: ["dashboard", "admin", "student-balance-details"],
    queryFn: () => getAdminStudentBalanceDetails({ limit: 300 }),
    enabled: fullProfileQuery.isSuccess && !isAssistantStaff && isStudentBalanceOpen,
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

  const teacherCost = getBreakdownAmount(dashboard, "teacherCost");
  const customerCareCost = getBreakdownAmount(dashboard, "customerCareCost");
  const lessonCost = getBreakdownAmount(dashboard, "lessonCost");
  const bonusCost = getBreakdownAmount(dashboard, "bonusCost");
  const extraAllowanceCost = getBreakdownAmount(dashboard, "extraAllowanceCost");
  const operatingCost = getBreakdownAmount(dashboard, "operatingCost");
  const financeSignalCards = [
    {
      label: "Tổng nạp trong tháng",
      value: formatCurrency(dashboard.summary.monthlyTopupTotal),
      description: "Topup phát sinh theo giao dịch ví trong kỳ đang xem.",
      tone: "primary" as const,
    },
    {
      label: "Tổng chi đã ghi nhận",
      value: formatCurrency(dashboard.summary.monthlyExpense),
      description: "Bao gồm nhân sự, bonus, trợ cấp và vận hành trong kỳ.",
      tone: "info" as const,
    },
    {
      label: "Lợi nhuận tháng",
      value: formatCurrency(dashboard.summary.monthlyProfit),
      description:
        dashboard.summary.monthlyTopupTotal > 0
          ? `${Math.round((dashboard.summary.monthlyRevenue / dashboard.summary.monthlyTopupTotal) * 100)}% topup đã được ghi nhận thành doanh thu`
          : "Chưa có giao dịch nạp trong kỳ đang xem.",
      tone: dashboard.summary.monthlyProfit >= 0 ? ("success" as const) : ("warning" as const),
    },
  ];
  const financialRows: FinancialRow[] = [
    {
      group: "Dòng tiền",
      label: "Tổng nạp",
      value: dashboard.summary.monthlyTopupTotal,
      note: "Topup phát sinh trong kỳ đang xem. Nhấp để mở lịch sử nạp chi tiết.",
      tone: "primary",
      drilldown: "topup-history",
    },
    {
      group: "Dòng tiền",
      label: "Doanh thu đã ghi nhận",
      value: dashboard.summary.monthlyRevenue,
      note: "Chỉ tính học phí từ attendance có trạng thái present trong tháng.",
      tone: "success",
    },
    {
      group: "Treo & công nợ",
      label: "Học phí chưa dạy",
      value: dashboard.summary.prepaidTuitionTotal,
      note: "Snapshot số dư dương còn treo trên ví của học sinh active. Nhấp để xem chi tiết.",
      tone: "warning",
      drilldown: "student-balance",
    },
    {
      group: "Treo & công nợ",
      label: "Chưa thu học phí",
      value: dashboard.summary.pendingCollectionTotal,
      note: "Snapshot số dư âm cần follow-up thu thêm từ học sinh.",
      tone: "danger",
    },
    {
      group: "Treo & công nợ",
      label: "Nhân sự chờ thanh toán",
      value: dashboard.summary.pendingPayrollTotal,
      note: `Buổi dạy: ${formatCurrency(teacherCost)} • CSKH: ${formatCurrency(customerCareCost)} • Giáo án: ${formatCurrency(lessonCost)} • Bonus: ${formatCurrency(bonusCost)} • Trợ cấp: ${formatCurrency(extraAllowanceCost)}`,
      tone: "info",
    },
    {
      group: "Chi phí",
      label: "Chi giảng dạy",
      value: teacherCost,
      note: "Phụ cấp buổi dạy đã ghi nhận trong tháng.",
      tone: "default",
    },
    {
      group: "Chi phí",
      label: "Chi CSKH",
      value: customerCareCost,
      note: "Chi phí customer care phát sinh từ attendance trong tháng.",
      tone: "default",
    },
    {
      group: "Chi phí",
      label: "Chi giáo án",
      value: lessonCost,
      note: "Chi phí lesson output phát sinh trong tháng.",
      tone: "default",
    },
    {
      group: "Chi phí",
      label: "Bonus",
      value: bonusCost,
      note: "Khoản thưởng theo tháng đang xem.",
      tone: "default",
    },
    {
      group: "Chi phí",
      label: "Trợ cấp khác",
      value: extraAllowanceCost,
      note: "Extra allowance ghi nhận theo tháng đang xem.",
      tone: "default",
    },
    {
      group: "Chi phí",
      label: "Chi phí vận hành",
      value: operatingCost,
      note: "Marketing, học thử và các khoản vận hành khác.",
      tone: "default",
    },
    {
      group: "Chi phí",
      label: "Tổng chi đã ghi nhận",
      value: dashboard.summary.monthlyExpense,
      note: "Tổng chi phí ghi nhận trong kỳ đang xem.",
      tone: "default",
      emphasis: true,
    },
    {
      group: "Kết quả",
      label: "Lợi nhuận tháng",
      value: dashboard.summary.monthlyProfit,
      note: "Doanh thu đã ghi nhận trừ tổng chi đã ghi nhận.",
      tone: dashboard.summary.monthlyProfit >= 0 ? "success" : "danger",
      emphasis: true,
    },
  ];
  const financialCsvRows = financialRows.map((row) => ({
    label: `${row.group} - ${row.label}`,
    value: formatCurrency(row.value),
    note: row.note,
  }));
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

  const openAlertDetail = (alert: AdminDashboardActionAlert) => {
    if (alert.targetType === "student") {
      router.push(buildAdminLikePath(routeBase, `students/${alert.targetId}`));
      return;
    }
    if (alert.targetType === "staff") {
      router.push(buildAdminLikePath(routeBase, `staffs/${alert.targetId}`));
      return;
    }
    router.push(buildAdminLikePath(routeBase, `classes/${alert.targetId}`));
  };

  const quickCards =
    quickView === "finance"
      ? [
        {
          label: "Tổng doanh thu",
          value: formatCurrency(yearlyRevenueTotal),
          description: "Học phí đã ghi nhận của toàn bộ các quý trong năm.",
        },
        {
          label: "Tổng chi phí",
          value: formatCurrency(yearlyExpenseTotal),
          description: "Nhân sự và vận hành đã ghi nhận trong năm đang xem.",
        },
        {
          label: "Lợi nhuận ròng",
          value: formatCurrency(yearlyProfitTotal),
          description: "Doanh thu trừ chi phí của toàn bộ năm đang xem.",
        },
        { label: "Quý hiệu quả nhất", value: bestQuarter.quarter, description: `${formatCurrency(bestQuarter.profit)} lợi nhuận` },
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
              onClick={() => exportCsv(`dashboard-${year}-${month}.csv`, financialCsvRows)}
              className="inline-flex min-h-10 items-center rounded-md bg-primary px-3 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Xuất Excel
            </button>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard title="Lớp học" value={String(dashboard.summary.activeClasses)} note={`${dashboard.summary.activeClasses} đang hoạt động`} tone="primary" />
          <KpiCard title="Học sinh" value={String(dashboard.summary.activeStudents)} note={`${dashboard.summary.activeStudents} đang học`} tone="default" />
          <KpiCard
            title="Nhân sự chờ thanh toán"
            value={String(dashboard.summary.unpaidStaffCount)}
            note={`${dashboard.summary.unpaidStaffCount} nhân sự còn pending`}
            tone="warning"
          />
          <KpiCard
            title="Lợi nhuận tháng"
            value={formatCurrency(dashboard.summary.monthlyProfit)}
            note="Doanh thu đã ghi nhận - tổng chi trong tháng"
            tone={dashboard.summary.monthlyProfit >= 0 ? "success" : "warning"}
          />
          <KpiCard
            title="Học phí chưa dạy"
            value={formatCurrency(dashboard.summary.prepaidTuitionTotal)}
            note="Số dư dương còn treo trên ví học sinh"
            tone="warning"
          />
          <KpiCard
            title="Chưa thu học phí"
            value={formatCurrency(dashboard.summary.pendingCollectionTotal)}
            note="Số dư âm cần follow-up thu thêm"
            tone="default"
          />
        </section>

        <section className="overflow-hidden rounded-[24px] border border-border-default bg-bg-surface shadow-[0_24px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="border-b border-border-default bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_38%),linear-gradient(135deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Finance Ledger</p>
                <h2 className="mt-2 text-xl font-semibold text-balance text-text-primary">Báo cáo tài chính</h2>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  Bảng đã tách rõ dòng tiền, khoản treo, công nợ và chi phí ghi nhận để tránh đọc nhầm giữa topup, số dư
                  ví học sinh và doanh thu thực tế.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[660px]">
                {financeSignalCards.map((card) => (
                  <div
                    key={card.label}
                    className={`rounded-2xl border bg-bg-surface/90 p-4 shadow-sm ${
                      card.tone === "success"
                        ? "border-success/20"
                        : card.tone === "warning"
                          ? "border-warning/20"
                          : card.tone === "info"
                            ? "border-info/20"
                            : "border-primary/20"
                    }`}
                  >
                    <p className="text-xs font-medium text-text-muted">{card.label}</p>
                    <p className={`mt-2 text-2xl font-semibold tabular-nums ${getFinancialValueClass(card.tone)}`}>{card.value}</p>
                    <p className="mt-1 text-xs leading-5 text-text-secondary">{card.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto px-2 py-2 sm:px-4">
            <Table>
              <TableCaption className="px-3 pb-3 pt-2 text-left text-xs text-text-muted">
                Nhấp vào dòng <span className="font-medium text-text-primary">Tổng nạp</span> hoặc{" "}
                <span className="font-medium text-text-primary">Học phí chưa dạy</span> để mở drill-down chi tiết.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Nhóm</TableHead>
                  <TableHead className="min-w-[260px]">Danh mục</TableHead>
                  <TableHead className="w-[220px] text-right">Giá trị</TableHead>
                  <TableHead className="min-w-[320px]">Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financialRows.map((row) => (
                  <TableRow key={`${row.group}-${row.label}`} className={row.emphasis ? "bg-bg-secondary/45" : undefined}>
                    <TableCell>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getFinancialGroupClass(row.group)}`}>
                        {row.group}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <p className="font-semibold text-text-primary">{row.label}</p>
                    </TableCell>
                    <TableCell className={`text-right font-semibold tabular-nums ${getFinancialValueClass(row.tone)}`}>
                      {row.drilldown ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (row.drilldown === "topup-history") {
                              setIsTopupHistoryOpen(true);
                              return;
                            }
                            setIsStudentBalanceOpen(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-md text-right underline decoration-current/35 underline-offset-3 transition-colors hover:text-text-primary hover:decoration-current focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          aria-label={
                            row.drilldown === "topup-history"
                              ? "Mở lịch sử nạp theo tháng đang xem"
                              : "Mở chi tiết học phí chưa dạy của học sinh"
                          }
                        >
                          {formatCurrency(row.value)}
                        </button>
                      ) : (
                        formatCurrency(row.value)
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal leading-6 text-text-secondary">{row.note}</TableCell>
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
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span id={quickViewYearLabelId}>Năm</span>
              <div className="w-[120px]">
                <UpgradedSelect
                  labelId={quickViewYearLabelId}
                  value={year}
                  onValueChange={setYear}
                  options={yearOptions}
                  buttonClassName="min-h-9 rounded-md border border-border-default bg-bg-surface px-2.5 py-2 text-sm text-text-primary shadow-none transition-colors duration-200 hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  menuClassName="overflow-auto rounded-xl border border-border-default bg-bg-surface p-1 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)]"
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
                  className="flex h-auto max-h-full w-full flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-2xl overscroll-contain"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-border-default px-5 py-4">
                    <div>
                      <h2 id="dashboard-topup-history-title" className="text-xl font-semibold text-balance text-text-primary">
                        Lịch sử nạp
                      </h2>
                      <p className="mt-1 text-sm text-text-secondary">
                        Topup trong kỳ đang chọn, gồm thời điểm phát sinh, học sinh, số tiền và mức tích lũy trước/sau giao dịch.
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
                  className="flex h-auto max-h-full w-full flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-2xl overscroll-contain"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-border-default px-5 py-4">
                    <div>
                      <h2 id="dashboard-student-balance-title" className="text-xl font-semibold text-balance text-text-primary">
                        Chi tiết học phí chưa dạy
                      </h2>
                      <p className="mt-1 text-sm text-text-secondary">
                        Snapshot số dư dương hiện tại của học sinh active thuộc lớp running.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsStudentBalanceOpen(false)}
                      className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      aria-label="Đóng popup chi tiết học phí chưa dạy"
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
