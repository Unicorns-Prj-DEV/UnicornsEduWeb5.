"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { getAdminDashboard } from "@/lib/apis/dashboard.api";
import {
  AdminDashboardActionAlert,
  AdminDashboardBreakdownItem,
  AdminDashboardBreakdownKey,
  AdminDashboardClassPerformance,
  AdminDashboardDto,
} from "@/dtos/dashboard.dto";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const revenueProfitChartConfig = {
  revenue: { label: "Doanh thu", color: "var(--ue-primary)" },
  profit: { label: "Lợi nhuận", color: "var(--ue-success)" },
} satisfies ChartConfig;

const incomeChartConfig = {
  amount: { label: "Giá trị", color: "var(--ue-primary)" },
} satisfies ChartConfig;

const BREAKDOWN_COLORS: Record<AdminDashboardBreakdownKey, string> = {
  revenue: "var(--ue-primary)",
  teacherCost: "var(--ue-success)",
  customerCareCost: "var(--ue-info)",
  lessonCost: "var(--ue-warning)",
  bonusCost: "color-mix(in srgb, var(--ue-warning) 60%, var(--ue-error) 40%)",
  extraAllowanceCost: "var(--ue-text-secondary)",
  operatingCost: "color-mix(in srgb, var(--ue-primary) 35%, var(--ue-text-primary) 65%)",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${new Intl.NumberFormat("vi-VN", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value)}`;
}

function toneVariant(tone: AdminDashboardActionAlert["severity"]) {
  if (tone === "warning") return "warning";
  if (tone === "destructive") return "destructive";
  return "info";
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

function SectionKicker({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[0.24em] text-text-muted uppercase">{children}</p>;
}

function SectionHeading({
  kicker,
  title,
  description,
  aside,
}: {
  kicker: string;
  title: string;
  description: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="min-w-0">
        <SectionKicker>{kicker}</SectionKicker>
        <h2 className="mt-3 text-balance text-[1.7rem] font-semibold tracking-[-0.05em] text-text-primary sm:text-[2rem]">
          {title}
        </h2>
        <CardDescription className="mt-3 max-w-2xl">{description}</CardDescription>
      </div>
      {aside ? <div className="min-w-0">{aside}</div> : null}
    </div>
  );
}

function OverviewRailItem({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-success/20 bg-success/10"
      : tone === "warning"
        ? "border-warning/20 bg-warning/10"
        : "border-border-default bg-bg-secondary";

  return (
    <div className={`rounded-[1.2rem] border p-4 ${toneClass}`}>
      <p className="text-[11px] font-semibold tracking-[0.2em] text-text-muted uppercase">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-text-primary sm:text-[2rem]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{detail}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  supporting,
  tone,
}: {
  label: string;
  value: string;
  supporting: string;
  tone: "default" | "success" | "warning" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "border-success/20 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ue-success)_12%,transparent),transparent_88%)]"
      : tone === "warning"
        ? "border-warning/20 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ue-warning)_12%,transparent),transparent_88%)]"
        : tone === "info"
          ? "border-info/20 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ue-info)_12%,transparent),transparent_88%)]"
          : "border-border-default bg-bg-surface";

  const accentClass =
    tone === "success"
      ? "bg-success"
      : tone === "warning"
        ? "bg-warning"
        : tone === "info"
          ? "bg-info"
          : "bg-primary";

  return (
    <div className={`rounded-[1.5rem] border p-5 ${toneClass}`}>
      <span className={`block h-1.5 w-14 rounded-full ${accentClass}`} aria-hidden />
      <p className="mt-4 text-[11px] font-semibold tracking-[0.2em] text-text-muted uppercase">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.06em] text-text-primary sm:text-[2.5rem]">{value}</p>
      <p className="mt-3 text-sm leading-6 text-text-secondary">{supporting}</p>
    </div>
  );
}

function StatusPanel({
  label,
  value,
  supporting,
  tone,
  iconPath,
}: {
  label: string;
  value: string;
  supporting: string;
  tone: "warning" | "destructive" | "info";
  iconPath: string;
}) {
  const toneClass =
    tone === "warning"
      ? "border-warning/20 bg-warning/10 text-warning"
      : tone === "destructive"
        ? "border-error/20 bg-error/10 text-error"
        : "border-info/20 bg-info/10 text-info";

  return (
    <div className={`rounded-[1.35rem] border p-4 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full border border-current/15 bg-current/10 p-2">
          <DashboardIcon path={iconPath} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-current/85 uppercase">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-text-primary">{value}</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{supporting}</p>
        </div>
      </div>
    </div>
  );
}

function LeaderboardCard({
  item,
  index,
  maxRevenue,
}: {
  item: AdminDashboardClassPerformance;
  index: number;
  maxRevenue: number;
}) {
  const revenueWidth = Math.max(16, Math.round((item.revenue / maxRevenue) * 100));
  const profitVariant = item.profit >= 0 ? "success" : "destructive";

  return (
    <div className="rounded-[1.4rem] border border-border-default bg-bg-secondary p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-8 items-center justify-center rounded-full border border-border-default bg-bg-surface text-sm font-semibold text-text-primary">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-text-primary">{item.name}</p>
              <p className="text-sm leading-6 text-text-muted">
                {item.students} học sinh · {item.balanceRisk > 0 ? `rủi ro ${formatCompactCurrency(item.balanceRisk)}` : "ví ổn định"}
              </p>
            </div>
          </div>
        </div>
        <Badge variant={profitVariant}>{item.profit >= 0 ? "Biên dương" : "Biên âm"}</Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-text-muted uppercase">Doanh Thu</p>
          <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-text-primary">{formatCurrency(item.revenue)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-text-muted uppercase">Lợi Nhuận Gộp</p>
          <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-text-primary">{formatCurrency(item.profit)}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-xs text-text-muted">
          <span>Mức đóng góp doanh thu</span>
          <span>{formatCompactCurrency(item.revenue)}</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-bg-primary">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--ue-primary),color-mix(in_srgb,var(--ue-primary)_50%,white))]"
            style={{ width: `${revenueWidth}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function DashboardLoadingState() {
  return (
    <div className="min-h-full overflow-hidden bg-bg-primary">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
        <Card className="overflow-hidden rounded-[2.5rem]">
          <CardContent className="flex flex-col gap-8 py-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Skeleton className="h-8 w-32 rounded-full" />
              <Skeleton className="h-8 w-40 rounded-full" />
            </div>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
              <div className="flex flex-col gap-4">
                <Skeleton className="h-4 w-36 rounded-full" />
                <Skeleton className="h-18 w-full max-w-4xl rounded-[2rem]" />
                <Skeleton className="h-7 w-full max-w-3xl rounded-full" />
                <div className="grid gap-3 sm:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 rounded-[1.25rem]" />
                  ))}
                </div>
              </div>
              <Skeleton className="h-full min-h-[280px] rounded-[1.8rem]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-48 rounded-[1.5rem]" />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.95fr)]">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="gap-4">
                <Skeleton className="h-4 w-32 rounded-full" />
                <Skeleton className="h-10 w-72 rounded-[1.2rem]" />
                <Skeleton className="h-5 w-full max-w-2xl rounded-full" />
              </CardHeader>
              <CardContent className="grid gap-5">
                <Skeleton className="h-[320px] rounded-[1.6rem]" />
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 2 }).map((__, metricIndex) => (
                    <Skeleton key={metricIndex} className="h-24 rounded-[1.2rem]" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.16fr)_minmax(0,0.84fr)]">
          <Skeleton className="h-[420px] rounded-[2rem]" />
          <Skeleton className="h-[420px] rounded-[2rem]" />
        </div>

        <Skeleton className="h-[420px] rounded-[2rem]" />
      </div>
    </div>
  );
}

function EmptyTableRow({ message, colSpan }: { message: string; colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-sm text-text-muted">
        {message}
      </TableCell>
    </TableRow>
  );
}

export default function AdminDashboardTabPage() {
  const defaultPeriod = useMemo(() => {
    const now = new Date();
    return {
      month: String(now.getMonth() + 1).padStart(2, "0"),
      year: String(now.getFullYear()),
    };
  }, []);

  const dashboardQuery = useQuery<AdminDashboardDto>({
    queryKey: ["dashboard", "admin", defaultPeriod.year, defaultPeriod.month],
    queryFn: () =>
      getAdminDashboard({
        month: defaultPeriod.month,
        year: defaultPeriod.year,
        alertLimit: 6,
        topClassLimit: 5,
      }),
    staleTime: 30_000,
  });

  if (dashboardQuery.isLoading) {
    return <DashboardLoadingState />;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <div className="min-h-full overflow-hidden bg-bg-primary">
        <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
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
  const yearlyRevenueTotal = dashboard.yearlySummary.reduce((total, item) => total + item.revenue, 0);
  const yearlyExpenseTotal = dashboard.yearlySummary.reduce((total, item) => total + item.expense, 0);
  const yearlyProfitTotal = dashboard.yearlySummary.reduce((total, item) => total + item.profit, 0);
  const breakdownRows = dashboard.breakdown.map((item) => ({
    ...item,
    fill: BREAKDOWN_COLORS[item.key],
  }));
  const largestExpenseItem = breakdownRows
    .filter((item) => item.kind === "expense")
    .sort((left, right) => right.amount - left.amount)[0];
  const profitMargin =
    dashboard.summary.monthlyRevenue > 0 ? dashboard.summary.monthlyProfit / dashboard.summary.monthlyRevenue : 0;
  const topClassMaxRevenue = Math.max(1, ...dashboard.classPerformance.map((item) => item.revenue));
  const actionFollowUpTotal = dashboard.actionAlerts.reduce((total, item) => total + item.amount, 0);
  const primaryGrowthNote =
    dashboard.summary.monthlyProfit >= 0
      ? `Lợi nhuận ròng đang giữ ở ${formatCompactCurrency(dashboard.summary.monthlyProfit)} trong ${dashboard.period.monthLabel.toLowerCase()}.`
      : `Biên lợi nhuận đang âm ${formatCompactCurrency(Math.abs(dashboard.summary.monthlyProfit))}; cần siết lại các nhóm chi phí tháng này.`;

  return (
    <div className="relative min-h-full overflow-hidden bg-bg-primary">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] opacity-90"
        style={{
          backgroundImage:
            "radial-gradient(circle at top left, color-mix(in srgb, var(--ue-primary) 12%, transparent), transparent 30%), radial-gradient(circle at 85% 10%, color-mix(in srgb, var(--ue-warning) 10%, transparent), transparent 28%), linear-gradient(180deg, color-mix(in srgb, var(--ue-primary) 4%, transparent), transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-[1480px] flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
        <section
          aria-labelledby="dashboard-overview-title"
          className="motion-fade-up relative overflow-hidden rounded-[2.5rem] border border-border-default bg-bg-surface"
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(135deg, color-mix(in srgb, var(--ue-primary) 8%, transparent), transparent 32%), radial-gradient(circle at top right, color-mix(in srgb, var(--ue-warning) 8%, transparent), transparent 24%)",
            }}
          />

          <div className="relative flex flex-col gap-8 px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-bg-surface/90 px-3 py-1.5 backdrop-blur">
                  Operations Snapshot
                </Badge>
                <Badge variant="secondary" className="bg-bg-primary/70 px-3 py-1.5">
                  Live aggregate từ database
                </Badge>
              </div>
              <Badge
                variant={dashboard.summary.monthlyProfit >= 0 ? "success" : "destructive"}
                className="px-3 py-1.5"
              >
                {dashboard.period.monthLabel}
              </Badge>
            </div>

            <div className="flex">
              <div className="min-w-0 flex-1">
                {/* <SectionKicker>Financial Control Center</SectionKicker> */}
                <h1
                  id="dashboard-overview-title"
                  className="hidden mt-4 max-w-5xl text-balance text-[clamp(2.7rem,6vw,5.8rem)] font-semibold leading-[0.96] tracking-[-0.08em] text-text-primary"
                >
                  Admin Dashboard
                </h1>


                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.2rem] border border-border-default bg-bg-primary/70 px-4 py-3 backdrop-blur">
                    <SectionKicker>Kỳ Xem</SectionKicker>
                    <p className="mt-2 font-medium text-text-primary">{dashboard.period.monthLabel}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-border-default bg-bg-primary/70 px-4 py-3 backdrop-blur">
                    <SectionKicker>Học Sinh Active</SectionKicker>
                    <p className="mt-2 font-medium text-text-primary">
                      {dashboard.summary.activeStudents} học sinh đang thuộc lớp running
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] border border-border-default bg-bg-primary/70 px-4 py-3 backdrop-blur">
                    <SectionKicker>Nhịp Ưu Tiên</SectionKicker>
                    <p className="mt-2 font-medium text-text-primary">
                      {dashboard.summary.totalAlerts} điểm cần follow-up trong tháng
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              <MetricCard
                label="Doanh Thu Tháng"
                value={formatCompactCurrency(dashboard.summary.monthlyRevenue)}
                supporting={`Ghi nhận trực tiếp từ attendance.present trong ${dashboard.period.monthLabel.toLowerCase()}.`}
                tone="default"
              />
              <MetricCard
                label="Lợi Nhuận Tháng"
                value={formatCompactCurrency(dashboard.summary.monthlyProfit)}
                supporting={primaryGrowthNote}
                tone="success"
              />
              <MetricCard
                label="Tổng Chi Phí"
                value={formatCompactCurrency(dashboard.summary.monthlyExpense)}
                supporting="Đã gồm giảng dạy, CSKH, giáo án, bonus, trợ cấp và chi phí mở rộng."
                tone="info"
              />
              <MetricCard
                label="Cảnh Báo Mở"
                value={String(dashboard.summary.totalAlerts)}
                supporting={`${dashboard.summary.expiringStudentsCount} sắp hết tiền, ${dashboard.summary.debtStudentsCount} chưa thu, ${dashboard.summary.unpaidStaffCount} payroll pending.`}
                tone="warning"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.95fr)]">
          <Card className="motion-fade-up overflow-hidden rounded-[2rem]">
            <CardHeader className="gap-5">
              <SectionHeading
                kicker="Revenue Pulse"
                title="Biến động doanh thu và lợi nhuận"
                description="Biểu đồ giữ trọng tâm vào nhịp vận hành theo tháng, bớt phần mô tả dư và đẩy số tổng hợp lên header để scan nhanh hơn."
                aside={
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.1rem] border border-border-default bg-bg-secondary px-4 py-3">
                      <SectionKicker>Doanh Thu Năm</SectionKicker>
                      <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-text-primary">
                        {formatCompactCurrency(yearlyRevenueTotal)}
                      </p>
                    </div>
                    <div className="rounded-[1.1rem] border border-border-default bg-bg-secondary px-4 py-3">
                      <SectionKicker>Chi Phí Năm</SectionKicker>
                      <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-text-primary">
                        {formatCompactCurrency(yearlyExpenseTotal)}
                      </p>
                    </div>
                    <div className="rounded-[1.1rem] border border-border-default bg-bg-secondary px-4 py-3">
                      <SectionKicker>Lợi Nhuận Năm</SectionKicker>
                      <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-text-primary">
                        {formatCompactCurrency(yearlyProfitTotal)}
                      </p>
                    </div>
                  </div>
                }
              />
            </CardHeader>

            <CardContent className="px-3 pb-0 sm:px-6">
              <ChartContainer config={revenueProfitChartConfig} className="min-h-[340px] w-full">
                <LineChart data={dashboard.revenueProfitTrend} margin={{ left: 8, right: 8, top: 16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} minTickGap={20} />
                  <YAxis hide />
                  <ChartTooltip
                    cursor={{
                      stroke: "color-mix(in srgb, var(--ue-border-default) 80%, transparent)",
                      strokeDasharray: "4 4",
                    }}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => <span className="text-text-primary">{String(value)}</span>}
                        formatter={(value, name) => (
                          <div className="flex w-full items-center justify-between gap-6">
                            <span className="text-text-muted">
                              {Object.hasOwn(revenueProfitChartConfig, String(name))
                                ? revenueProfitChartConfig[String(name) as keyof typeof revenueProfitChartConfig].label
                                : String(name)}
                            </span>
                            <span className="font-mono font-semibold tabular-nums text-text-primary">
                              {formatCurrency(Number(value))}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    fill="url(#revenue-fill)"
                    fillOpacity={1}
                    stroke="var(--color-revenue)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="var(--color-profit)"
                    strokeWidth={2.5}
                    dot={{ fill: "var(--color-profit)", r: 3 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>


          </Card>

          <Card className="motion-fade-up overflow-hidden rounded-[2rem]">
            <CardHeader className="gap-5">
              <SectionHeading
                kicker="Cost Anatomy"
                title="Thu và chi trong tháng"
                description="Biểu đồ ngang giúp nhận ra ngay khoản nào đang kéo biên lợi nhuận xuống, còn danh sách dưới giữ lại phần đối chiếu chi tiết."
                aside={
                  <div className="rounded-[1.2rem] border border-border-default bg-bg-secondary px-4 py-4">
                    <SectionKicker>Net Position</SectionKicker>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-text-primary">
                      {formatCompactCurrency(dashboard.summary.monthlyProfit)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      {dashboard.summary.monthlyProfit >= 0 ? "Đang có lãi sau chi phí." : "Đang âm sau khi trừ các khoản chi."}
                    </p>
                  </div>
                }
              />
            </CardHeader>

            <CardContent className="grid gap-5 px-3 sm:px-6">
              <ChartContainer config={incomeChartConfig} className="min-h-[320px] w-full">
                <BarChart data={breakdownRows} layout="vertical" margin={{ left: 18, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="label" type="category" width={112} tickLine={false} axisLine={false} />
                  <ChartTooltip
                    cursor={{ fill: "color-mix(in srgb, var(--ue-primary) 8%, transparent)" }}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        indicator="line"
                        formatter={(value, name, item) => {
                          const label =
                            typeof item.payload === "object" && item.payload !== null && "label" in item.payload
                              ? String(item.payload.label)
                              : String(name);

                          return (
                            <div className="flex w-full items-center justify-between gap-6">
                              <span className="text-text-muted">{label}</span>
                              <span className="font-mono font-semibold tabular-nums text-text-primary">
                                {formatCurrency(Number(value))}
                              </span>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <Bar dataKey="amount" radius={12}>
                    {breakdownRows.map((item: AdminDashboardBreakdownItem & { fill: string }) => (
                      <Cell key={item.key} fill={item.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>

              <div className="grid grid-cols-2 flex-wrap gap-1">
                {breakdownRows.map((item) => (
                  <div
                    key={item.key}
                    className="flex flex-row w-full gap-3 rounded-[1.2rem] border border-border-default bg-bg-secondary px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 w-full">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: item.fill }} aria-hidden />
                        <p className="font-medium text-text-primary">{item.label}</p>
                      </div>
                      <p className="font-mono text-base font-semibold tabular-nums text-text-primary text-center">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>

                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.16fr)_minmax(0,0.84fr)]">
          <Card className="motion-fade-up overflow-hidden rounded-[2rem]">
            <CardHeader className="gap-5">
              <SectionHeading
                kicker="Action Queue"
                title="Cảnh báo hành động"
                description="Nhóm cảnh báo được làm gọn hơn để người vận hành nhìn ra thứ tự ưu tiên trước, sau đó mới đọc xuống bảng chi tiết."
                aside={
                  <div className="rounded-[1.2rem] border border-border-default bg-bg-secondary px-4 py-4">
                    <SectionKicker>Giá Trị Cần Theo Dõi</SectionKicker>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-text-primary">
                      {formatCompactCurrency(actionFollowUpTotal)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      Tổng cộng của các dòng cảnh báo đang hiển thị trên dashboard.
                    </p>
                  </div>
                }
              />
            </CardHeader>

            <CardContent className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <StatusPanel
                  label="Sắp Hết Tiền"
                  value={String(dashboard.summary.expiringStudentsCount)}
                  supporting="Những học sinh chỉ còn khoảng tối đa 2 buổi theo mức phí effective hiện tại."
                  tone="warning"
                  iconPath="M12 8v5l3 3m6-4a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <StatusPanel
                  label="Chưa Thu"
                  value={formatCompactCurrency(dashboard.summary.pendingCollectionTotal)}
                  supporting={`${dashboard.summary.debtStudentsCount} học sinh đang âm số dư và cần follow-up.`}
                  tone="destructive"
                  iconPath="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
                />
                <StatusPanel
                  label="Payroll Pending"
                  value={formatCompactCurrency(dashboard.summary.pendingPayrollTotal)}
                  supporting={`${dashboard.summary.unpaidStaffCount} nhân sự còn khoản pending ở payroll.`}
                  tone="info"
                  iconPath="M17 9V7a5 5 0 00-10 0v2m-1 0h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1z"
                />
              </div>

              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nhóm Cảnh Báo</TableHead>
                    <TableHead>Đối Tượng</TableHead>
                    <TableHead>Phụ Trách</TableHead>
                    <TableHead>Hạn Xử Lý</TableHead>
                    <TableHead className="text-right">Giá Trị</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.actionAlerts.length > 0 ? (
                    dashboard.actionAlerts.map((item) => (
                      <TableRow key={`${item.type}-${item.subject}`}>
                        <TableCell>
                          <Badge variant={toneVariant(item.severity)}>{item.type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[20rem] min-w-0 whitespace-normal text-text-primary">{item.subject}</TableCell>
                        <TableCell>{item.owner ?? "Chưa gán"}</TableCell>
                        <TableCell>{item.due}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-text-primary">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <EmptyTableRow message="Chưa có cảnh báo nào trong kỳ hiện tại." colSpan={5} />
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="font-medium text-text-primary">
                      Tổng giá trị cần theo dõi
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold tabular-nums text-text-primary">
                      {formatCurrency(actionFollowUpTotal)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          <Card className="motion-fade-up overflow-hidden rounded-[2rem]">
            <CardHeader className="gap-5">
              <SectionHeading
                kicker="Class Leaderboard"
                title="Lớp tạo doanh thu"
                description="Bỏ bảng cứng ở cột phải và chuyển sang leaderboard card để khu vực này đỡ chật, đọc tốt hơn trên cả desktop lẫn mobile."
              />
            </CardHeader>

            <CardContent className="grid gap-3">
              {dashboard.classPerformance.length > 0 ? (
                dashboard.classPerformance.map((item, index) => (
                  <LeaderboardCard key={item.classId} item={item} index={index} maxRevenue={topClassMaxRevenue} />
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-border-default bg-bg-secondary px-4 py-10 text-center text-sm text-text-muted">
                  Chưa có lớp phát sinh doanh thu trong tháng hiện tại.
                </div>
              )}
            </CardContent>

            <CardFooter className="mt-2 border-t border-border-default pt-5">
              <div className="flex w-full flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
                <span>Top {dashboard.classPerformance.length} lớp theo doanh thu của tháng đang xem.</span>
                <Badge variant="secondary">{dashboard.period.monthLabel}</Badge>
              </div>
            </CardFooter>
          </Card>
        </section>

        <Card className="motion-fade-up overflow-hidden rounded-[2rem]">
          <CardHeader className="gap-6">
            <SectionHeading
              kicker="Year Overview"
              title="Tổng kết năm"
              description="Phần cuối trang được làm thành closing section rõ ràng hơn: có scan nhanh theo quý phía trên và table đối soát ngay bên dưới."
              aside={
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.1rem] border border-border-default bg-bg-secondary px-4 py-3">
                    <SectionKicker>Doanh Thu</SectionKicker>
                    <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-text-primary">
                      {formatCompactCurrency(yearlyRevenueTotal)}
                    </p>
                  </div>
                  <div className="rounded-[1.1rem] border border-border-default bg-bg-secondary px-4 py-3">
                    <SectionKicker>Chi Phí</SectionKicker>
                    <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-text-primary">
                      {formatCompactCurrency(yearlyExpenseTotal)}
                    </p>
                  </div>
                  <div className="rounded-[1.1rem] border border-border-default bg-bg-secondary px-4 py-3">
                    <SectionKicker>Lợi Nhuận</SectionKicker>
                    <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-text-primary">
                      {formatCompactCurrency(yearlyProfitTotal)}
                    </p>
                  </div>
                </div>
              }
            />
          </CardHeader>

          <CardContent className="grid gap-5">
            <div className="grid gap-3 lg:grid-cols-4">
              {dashboard.yearlySummary.map((item) => {
                const quarterMargin = item.revenue > 0 ? item.profit / item.revenue : 0;

                return (
                  <div key={item.quarter} className="rounded-[1.25rem] border border-border-default bg-bg-secondary px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline">{item.quarter}</Badge>
                      <span className="text-xs font-medium text-text-muted">{formatPercent(quarterMargin)}</span>
                    </div>
                    <p className="mt-4 text-2xl font-semibold tracking-[-0.05em] text-text-primary">
                      {formatCompactCurrency(item.profit)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      {item.classes} lớp có session · doanh thu {formatCompactCurrency(item.revenue)}
                    </p>
                  </div>
                );
              })}
            </div>

            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Quý</TableHead>
                  <TableHead>Số Lớp</TableHead>
                  <TableHead className="text-right">Doanh Thu</TableHead>
                  <TableHead className="text-right">Chi Phí</TableHead>
                  <TableHead className="text-right">Lợi Nhuận</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.yearlySummary.length > 0 ? (
                  dashboard.yearlySummary.map((item) => (
                    <TableRow key={item.quarter}>
                      <TableCell className="font-medium text-text-primary">{item.quarter}</TableCell>
                      <TableCell>{item.classes}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-text-primary">
                        {formatCurrency(item.revenue)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-text-primary">
                        {formatCurrency(item.expense)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-text-primary">
                        {formatCurrency(item.profit)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <EmptyTableRow message="Chưa có dữ liệu tổng kết năm." colSpan={5} />
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-medium text-text-primary">Tổng</TableCell>
                  <TableCell>{dashboard.yearlySummary.reduce((total, item) => total + item.classes, 0)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold tabular-nums text-text-primary">
                    {formatCurrency(yearlyRevenueTotal)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold tabular-nums text-text-primary">
                    {formatCurrency(yearlyExpenseTotal)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold tabular-nums text-text-primary">
                    {formatCurrency(yearlyProfitTotal)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
