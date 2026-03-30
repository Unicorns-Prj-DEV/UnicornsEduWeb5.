"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getFullProfile,
  getMyStaffExtraAllowances,
  getMyStaffIncomeSummary,
} from "@/lib/apis/auth.api";
import { formatCurrency } from "@/lib/class.helpers";
import { ROLE_LABELS } from "@/lib/staff.constants";

const RECENT_UNPAID_DAYS = 14;

type CommandTone = "primary" | "warning" | "info" | "neutral";
type ShortcutShell = "Admin shell" | "Staff shell";

type CommandShortcut = {
  href: string;
  label: string;
  description: string;
  eyebrow: string;
  shell: ShortcutShell;
  tone: CommandTone;
};

function getCurrentMonth() {
  const now = new Date();
  return {
    month: String(now.getMonth() + 1).padStart(2, "0"),
    year: String(now.getFullYear()),
  };
}

function formatCount(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function getCommandToneClass(tone: CommandTone) {
  switch (tone) {
    case "primary":
      return "border-primary/20 bg-primary/10";
    case "warning":
      return "border-warning/25 bg-warning/10";
    case "info":
      return "border-info/20 bg-info/10";
    default:
      return "border-border-default bg-bg-surface/92";
  }
}

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

function StaffRootLoadingState() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6" aria-busy="true">
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

function AssistantMetricCard({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  tone?: CommandTone;
}) {
  return (
    <article
      className={`rounded-[1.4rem] border px-4 py-4 shadow-sm sm:px-5 ${getCommandToneClass(
        tone,
      )}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-text-primary">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{note}</p>
    </article>
  );
}

function CommandSectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-text-primary">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
        {description}
      </p>
    </div>
  );
}

function CommandShortcutCard({
  shortcut,
}: {
  shortcut: CommandShortcut;
}) {
  return (
    <Link
      href={shortcut.href}
      className={`group relative overflow-hidden rounded-[1.5rem] border p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${getCommandToneClass(
        shortcut.tone,
      )}`}
    >
      <div
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-70"
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
            {shortcut.eyebrow}
          </p>
          <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-text-primary">
            {shortcut.label}
          </h3>
        </div>
        <span className="inline-flex shrink-0 rounded-full border border-white/50 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-text-secondary backdrop-blur">
          {shortcut.shell}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-text-secondary">
        {shortcut.description}
      </p>

      <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary transition-transform duration-200 group-hover:translate-x-0.5">
        Mở nhanh
        <svg
          className="size-4 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </Link>
  );
}

function AssistantCommandHub({
  staffName,
  roles,
  assistantAllowanceTotal,
  monthlyIncomeTotal,
  monthlyIncomeUnpaid,
  pendingAssistantCount,
  ownStaffDetailHref,
  adminShortcuts,
  selfShortcuts,
  roleSpecificShortcuts,
}: {
  staffName: string;
  roles: string[];
  assistantAllowanceTotal: number;
  monthlyIncomeTotal: number;
  monthlyIncomeUnpaid: number;
  pendingAssistantCount: number;
  ownStaffDetailHref: string;
  adminShortcuts: CommandShortcut[];
  selfShortcuts: CommandShortcut[];
  roleSpecificShortcuts: CommandShortcut[];
}) {
  const totalVisibleCapabilities =
    adminShortcuts.length + selfShortcuts.length + roleSpecificShortcuts.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-[linear-gradient(130deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95),rgba(18,86,104,0.07)),radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_28%)] p-5 shadow-sm sm:p-6 lg:p-8">
        <div
          className="pointer-events-none absolute right-[-4rem] top-[-5rem] size-44 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-[-5rem] left-[20%] size-52 rounded-full bg-warning/15 blur-3xl"
          aria-hidden
        />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.95fr)] xl:items-end">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/85">
              Assistant Command Hub
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-text-primary sm:text-4xl">
              Điều phối toàn bộ tác vụ quản trị từ staff shell.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-text-secondary sm:text-[15px]">
              Role trợ lí dùng chung toàn bộ cây route quản trị ngay trong staff shell. Route này
              là command deck để mở nhanh đúng phân hệ cần làm việc, trong khi dashboard của trợ lí
              vẫn trỏ về staff detail riêng của chính bạn thay cho dashboard tổng hợp.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {roles.map((role) => (
                <span
                  key={role}
                  className="inline-flex rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-xs font-medium text-primary shadow-sm"
                >
                  {ROLE_LABELS[role] ?? role}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-primary/15 bg-white/75 p-4 shadow-sm backdrop-blur sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
              Điểm vào chính
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-text-primary">
              Hồ sơ nhân sự của {staffName}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Dashboard của trợ lí luôn mở vào staff detail của chính bạn. Từ đây bạn đi thẳng vào
              route mirror `/staff/dashboard` hoặc staff detail riêng mà không chạm vào aggregate dashboard.
            </p>
            <Link
              href={ownStaffDetailHref}
              className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Mở dashboard của tôi
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AssistantMetricCard
          label="Thu nhập tháng"
          value={formatCurrency(monthlyIncomeTotal)}
          note="Tổng thu nhập self-service của tháng hiện tại."
          tone="primary"
        />
        <AssistantMetricCard
          label="Chưa nhận"
          value={formatCurrency(monthlyIncomeUnpaid)}
          note="Khoản chưa thanh toán trong income summary của chính bạn."
          tone="warning"
        />
        <AssistantMetricCard
          label="Trợ cấp trợ lí"
          value={formatCurrency(assistantAllowanceTotal)}
          note="Tổng role assistant trong tháng hiện tại, lấy từ backend summary."
          tone="info"
        />
        <AssistantMetricCard
          label="Khoản pending"
          value={formatCount(pendingAssistantCount)}
          note={`${formatCount(totalVisibleCapabilities)} lối tắt đang khả dụng trong command hub này.`}
        />
      </section>

      <section className="mt-6 rounded-[2rem] border border-border-default bg-bg-surface/92 p-5 shadow-sm sm:p-6">
        <CommandSectionHeading
          eyebrow="Quản trị"
          title="Các phân hệ admin mà trợ lí được dùng"
          description="Những card này mở thẳng vào tree `/staff/**` mirror lại các module quản trị. Assistant giữ đầy đủ quyền admin ngay trong staff shell, ngoại trừ dashboard tổng hợp."
        />
        <div className="grid gap-4 xl:grid-cols-2">
          {adminShortcuts.map((shortcut) => (
            <CommandShortcutCard key={shortcut.href} shortcut={shortcut} />
          ))}
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.9fr)]">
        <section className="rounded-[2rem] border border-border-default bg-bg-surface/92 p-5 shadow-sm sm:p-6">
          <CommandSectionHeading
            eyebrow="Self Service"
            title="Tác vụ của chính bạn"
            description="Các màn này vẫn ở staff shell để bạn xử lý hồ sơ, trợ cấp trợ lí và tài liệu nội bộ mà không cần rời khỏi khu vực tự phục vụ."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {selfShortcuts.map((shortcut) => (
              <CommandShortcutCard key={shortcut.href} shortcut={shortcut} />
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-border-default bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-5 shadow-sm sm:p-6">
          <CommandSectionHeading
            eyebrow="Guard Rail"
            title="Ranh giới quyền"
            description="Hub này chỉ surfacing capability. Dashboard aggregate của admin vẫn bị khóa; mọi số liệu trên trang chỉ lấy từ self-service endpoints của chính bạn."
          />

          <div className="space-y-3 rounded-[1.35rem] border border-border-default bg-bg-secondary/40 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 size-2.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <p className="text-sm leading-6 text-text-secondary">
                Không gọi <span className="font-medium text-text-primary">/dashboard</span> và
                không hiển thị KPI aggregate của admin.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 size-2.5 shrink-0 rounded-full bg-warning" aria-hidden />
              <p className="text-sm leading-6 text-text-secondary">
                Các shortcut quản trị mở vào mirror route trong `/staff`, nhưng quyền backend vẫn
                tiếp tục dùng guard authoritative của admin/assistant.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 size-2.5 shrink-0 rounded-full bg-info" aria-hidden />
              <p className="text-sm leading-6 text-text-secondary">
                Nếu bạn đồng thời mang role khác, hub vẫn lộ đúng self-service route tương ứng ở
                phần dưới.
              </p>
            </div>
          </div>
        </section>
      </div>

      {roleSpecificShortcuts.length > 0 ? (
        <section className="mt-4 rounded-[2rem] border border-border-default bg-bg-surface/92 p-5 shadow-sm sm:p-6">
          <CommandSectionHeading
            eyebrow="Role Mix"
            title="Lối tắt theo role đang mang"
            description="Assistant có thể kiêm nhiều trách nhiệm. Những card này chỉ hiện khi hồ sơ hiện tại đang mang đúng role tương ứng."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roleSpecificShortcuts.map((shortcut) => (
              <CommandShortcutCard key={shortcut.href} shortcut={shortcut} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

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
                <li key={c.classId} className="flex items-center justify-between text-sm">
                  <span className="truncate text-text-primary">{c.className}</span>
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
    queryKey: ["staff", "self", "income-summary", year, month, RECENT_UNPAID_DAYS],
    queryFn: () =>
      getMyStaffIncomeSummary({ month, year, days: RECENT_UNPAID_DAYS }),
    enabled: !!linkedStaffId,
    staleTime: 30_000,
  });

  const { data: assistantPendingAllowanceResponse } = useQuery({
    queryKey: [
      "extra-allowance",
      "self",
      "assistant",
      "pending-count",
      year,
      month,
    ],
    queryFn: () =>
      getMyStaffExtraAllowances({
        page: 1,
        limit: 1,
        year,
        month,
        roleType: "assistant",
        status: "pending",
      }),
    enabled: !!linkedStaffId && isAssistant,
    staleTime: 30_000,
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
      incomeSummary?.otherRoleSummaries?.find((item) => item.role === "assistant") ?? {
        role: "assistant",
        label: ROLE_LABELS.assistant,
        total: 0,
        paid: 0,
        unpaid: 0,
      },
    [incomeSummary?.otherRoleSummaries],
  );

  const assistantOwnStaffDetailHref = linkedStaffId
    ? "/staff/dashboard"
    : "/staff/profile";

  const assistantAdminShortcuts = useMemo<CommandShortcut[]>(
    () => [
      {
        href: assistantOwnStaffDetailHref,
        label: "Dashboard của bạn",
        description:
          "Điểm vào thay cho dashboard aggregate. Route này sẽ mở đúng staff detail của chính bạn trong staff shell.",
        eyebrow: "Thay dashboard",
        shell: "Staff shell",
        tone: "primary",
      },
      {
        href: "/staff/staffs",
        label: "Nhân sự",
        description: "Quản lý danh sách staff, xem detail và theo dõi các flow liên quan tới nhân sự ngay trong staff shell.",
        eyebrow: "Nhân sự",
        shell: "Staff shell",
        tone: "neutral",
      },
      {
        href: "/staff/classes",
        label: "Lớp học",
        description: "Mở danh sách lớp để vào class detail, hỗ trợ teacher workflow và lịch học.",
        eyebrow: "Vận hành",
        shell: "Staff shell",
        tone: "info",
      },
      {
        href: "/staff/students",
        label: "Học sinh",
        description: "Đi vào student workspace để tra cứu hồ sơ, công nợ và lịch sử liên quan.",
        eyebrow: "Học viên",
        shell: "Staff shell",
        tone: "neutral",
      },
      {
        href: "/staff/costs",
        label: "Chi phí",
        description: "Xử lý các khoản chi và mở chi tiết các dòng tài chính quản trị.",
        eyebrow: "Tài chính",
        shell: "Staff shell",
        tone: "warning",
      },
      {
        href: "/staff/users",
        label: "Người dùng",
        description: "Tạo, sửa và phân quyền user trong staff shell dành riêng cho trợ lí.",
        eyebrow: "Tài khoản",
        shell: "Staff shell",
        tone: "neutral",
      },
      {
        href: "/staff/lesson-plans",
        label: "Giáo án",
        description: "Mở workspace lesson management dùng chung với admin, nhưng route-base giữ nguyên trong `/staff`.",
        eyebrow: "Nội dung",
        shell: "Staff shell",
        tone: "info",
      },
      {
        href: "/staff/history",
        label: "Lịch sử",
        description: "Tra audit log và action history của các thao tác quản trị trong hệ thống.",
        eyebrow: "Kiểm tra",
        shell: "Staff shell",
        tone: "neutral",
      },
    ],
    [assistantOwnStaffDetailHref],
  );

  const assistantSelfShortcuts = useMemo<CommandShortcut[]>(
    () => [
      {
        href: "/staff/profile",
        label: "Hồ sơ staff",
        description: "Đi tới self-service detail để chỉnh hồ sơ, xem thưởng, lịch sử buổi học và lớp phụ trách.",
        eyebrow: "Cá nhân",
        shell: "Staff shell",
        tone: "primary",
      },
      {
        href: "/staff/assistant-detail",
        label: "Trợ cấp trợ lí",
        description: "Xem đầy đủ lịch sử extra allowance của role assistant cho chính bạn.",
        eyebrow: "Allowance",
        shell: "Staff shell",
        tone: "warning",
      },
      {
        href: "/staff/notes-subject",
        label: "Ghi chú môn học",
        description: "Mở thư viện quy định và tài liệu nội bộ ngay trong staff shell.",
        eyebrow: "Knowledge",
        shell: "Staff shell",
        tone: "info",
      },
    ],
    [],
  );

  const assistantRoleSpecificShortcuts = useMemo<CommandShortcut[]>(() => {
    const shortcuts: CommandShortcut[] = [];

    if (staffRoles.includes("teacher")) {
      shortcuts.push({
        href: "/staff/profile",
        label: "Lớp phụ trách của tôi",
        description:
          "Đi qua self profile để mở section lớp phụ trách và teacher workflow hiện tại.",
        eyebrow: "Teacher",
        shell: "Staff shell",
        tone: "info",
      });
    }

    if (staffRoles.includes("customer_care")) {
      shortcuts.push({
        href: "/staff/customer-care-detail",
        label: "CSKH của tôi",
        description:
          "Mở self-service customer-care detail với tab học sinh và hoa hồng của chính bạn.",
        eyebrow: "Customer care",
        shell: "Staff shell",
        tone: "neutral",
      });
    }

    if (staffRoles.includes("lesson_plan_head")) {
      shortcuts.push({
        href: "/staff/lesson-plans",
        label: "Quản lí giáo án",
        description:
          "Vào lesson workspace manager dưới staff shell nếu bạn đang kiêm trưởng giáo án.",
        eyebrow: "Lesson manager",
        shell: "Staff shell",
        tone: "info",
      });
    } else if (staffRoles.includes("lesson_plan")) {
      shortcuts.push({
        href: "/staff/lesson-plan-tasks",
        label: "Task giáo án",
        description:
          "Mở participant workspace của lesson plan để xử lý đúng các task đang được gán.",
        eyebrow: "Lesson participant",
        shell: "Staff shell",
        tone: "info",
      });
    }

    if (staffRoles.includes("accountant")) {
      shortcuts.push({
        href: "/staff/accountant-detail",
        label: "Trợ cấp kế toán",
        description:
          "Xem lịch sử trợ cấp kế toán của chính bạn trong self-service shell.",
        eyebrow: "Accounting",
        shell: "Staff shell",
        tone: "warning",
      });
    }

    if (staffRoles.includes("communication")) {
      shortcuts.push({
        href: "/staff/communication-detail",
        label: "Truyền thông",
        description:
          "Mở trang chi tiết trợ cấp truyền thông của chính bạn nếu role này đang hoạt động.",
        eyebrow: "Communication",
        shell: "Staff shell",
        tone: "neutral",
      });
    }

    return shortcuts;
  }, [staffRoles]);

  if (profileLoading) {
    return <StaffRootLoadingState />;
  }

  const staffName =
    profile?.staffInfo?.fullName?.trim() || profile?.email || "Nhân sự";

  if (isAssistant) {
    return (
      <AssistantCommandHub
        staffName={staffName}
        roles={staffRoles}
        assistantAllowanceTotal={assistantRoleSummary.total}
        monthlyIncomeTotal={monthlyTotals.total}
        monthlyIncomeUnpaid={monthlyTotals.unpaid}
        pendingAssistantCount={assistantPendingAllowanceResponse?.meta.total ?? 0}
        ownStaffDetailHref={assistantOwnStaffDetailHref}
        adminShortcuts={assistantAdminShortcuts}
        selfShortcuts={assistantSelfShortcuts}
        roleSpecificShortcuts={assistantRoleSpecificShortcuts}
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
