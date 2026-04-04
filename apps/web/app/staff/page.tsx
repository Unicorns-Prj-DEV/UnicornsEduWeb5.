"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  getFullProfile,
  getMyStaffDashboard,
  getMyStaffIncomeSummary,
} from "@/lib/apis/auth.api";
import {
  type AdminDashboardActionAlert,
  type StaffDashboardAccountantSection,
  type StaffDashboardAssistantSection,
  type StaffDashboardCustomerCareSection,
  type StaffDashboardDto,
  type StaffDashboardLessonPlanHeadSection,
  type StaffDashboardLessonPlanSection,
  type StaffDashboardTaskItem,
  type StaffDashboardTeacherSection,
  type StaffDashboardUnpaidStaffItem,
} from "@/dtos/dashboard.dto";
import { formatCurrency, normalizeTimeOnly } from "@/lib/class.helpers";
import { ROLE_LABELS } from "@/lib/staff.constants";

const RECENT_UNPAID_DAYS = 14;

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  in_progress: "Đang làm",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const TASK_PRIORITY_LABELS: Record<string, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
};

const SESSION_PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Đã thanh toán",
  unpaid: "Chưa thanh toán",
  deposit: "Đã cọc",
};

function getCurrentMonth() {
  const now = new Date();
  return {
    month: String(now.getMonth() + 1).padStart(2, "0"),
    year: String(now.getFullYear()),
  };
}

function formatMonthLabel(month: string, year: string) {
  const monthIndex = Number(month) - 1;
  const parsedYear = Number(year);

  if (!Number.isFinite(monthIndex) || !Number.isFinite(parsedYear)) {
    return `Tháng ${month}/${year}`;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(parsedYear, monthIndex, 1)));
}

function formatShortDate(raw?: string | null) {
  if (!raw) return "Chưa đặt hạn";

  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(raw));
  } catch {
    return "Chưa đặt hạn";
  }
}

function formatTimeRange(startTime?: string | null, endTime?: string | null) {
  const start = normalizeTimeOnly(startTime ?? null);
  const end = normalizeTimeOnly(endTime ?? null);

  if (!start && !end) {
    return "Chưa có giờ cụ thể";
  }

  const startLabel = start ? start.slice(0, 5) : "—";
  const endLabel = end ? end.slice(0, 5) : "—";
  return `${startLabel} - ${endLabel}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.filter(Boolean).join(", ") || fallback;
  }

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return (error as Error)?.message ?? fallback;
}

function getAlertHref(alert: AdminDashboardActionAlert) {
  if (alert.targetType === "student") {
    return `/staff/students/${encodeURIComponent(alert.targetId)}`;
  }

  if (alert.targetType === "class") {
    return `/staff/classes/${encodeURIComponent(alert.targetId)}`;
  }

  if (alert.targetType === "staff") {
    return `/staff/staffs/${encodeURIComponent(alert.targetId)}`;
  }

  return null;
}

function taskStatusClasses(status: string) {
  if (status === "completed") {
    return "bg-success/12 text-success ring-success/20";
  }

  if (status === "in_progress") {
    return "bg-warning/12 text-warning ring-warning/20";
  }

  if (status === "cancelled") {
    return "bg-text-muted/12 text-text-muted ring-border-default";
  }

  return "bg-primary/12 text-primary ring-primary/20";
}

function priorityClasses(priority: string) {
  if (priority === "high") {
    return "bg-error/10 text-error ring-error/20";
  }

  if (priority === "medium") {
    return "bg-warning/10 text-warning ring-warning/20";
  }

  return "bg-text-muted/10 text-text-muted ring-border-default";
}

function SurfaceCard({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-balance text-lg font-semibold text-text-primary">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "primary"
      ? "border-primary/20 bg-primary/8"
      : tone === "success"
        ? "border-success/20 bg-success/8"
        : tone === "warning"
          ? "border-warning/20 bg-warning/8"
          : tone === "danger"
            ? "border-error/20 bg-error/8"
            : "border-border-default bg-bg-secondary/45";

  return (
    <article className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-text-primary">
        {value}
      </p>
    </article>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border-default bg-bg-secondary/35 px-4 py-6 text-center">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <p className="mt-1 text-sm leading-6 text-text-muted">{description}</p>
    </div>
  );
}

function SectionTitle({
  role,
  description,
  href,
  linkLabel,
}: {
  role: string;
  description: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
          {ROLE_LABELS[role] ?? role}
        </p>
        <p className="mt-1 text-sm leading-6 text-text-secondary">{description}</p>
      </div>
      {href && linkLabel ? (
        <Link
          href={href}
          className="inline-flex min-h-11 items-center rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

function TaskList({
  tasks,
  hrefBuilder,
  emptyTitle,
  emptyDescription,
}: {
  tasks: StaffDashboardTaskItem[];
  hrefBuilder: (taskId: string) => string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (tasks.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Link
          key={task.taskId}
          href={hrefBuilder(task.taskId)}
          className="block rounded-2xl border border-border-default bg-bg-secondary/20 p-4 transition-colors hover:bg-bg-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                {task.title?.trim() || "Task chưa đặt tên"}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Phụ trách: {task.responsibleName ?? "Chưa gán"}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Nhân sự: {task.assigneeNames.length > 0 ? task.assigneeNames.join(", ") : "Chưa có"}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${taskStatusClasses(task.status)}`}
              >
                {TASK_STATUS_LABELS[task.status] ?? task.status}
              </span>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${priorityClasses(task.priority)}`}
              >
                {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-text-muted">
            Hạn xử lý: {formatShortDate(task.dueDate)}
          </p>
        </Link>
      ))}
    </div>
  );
}

function TeacherSection({
  section,
  monthLabel,
}: {
  section: StaffDashboardTeacherSection;
  monthLabel: string;
}) {
  return (
    <section className="space-y-3">
      <SectionTitle
        role="teacher"
        description={`Theo dõi lớp phụ trách, cảnh báo lịch hoặc khảo sát, và lịch dạy hôm nay trong ${monthLabel}.`}
        href="/staff/profile"
        linkLabel="Mở hồ sơ chi tiết"
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <SurfaceCard
          eyebrow="Lớp phụ trách"
          title={`${section.assignedClasses.length} lớp đang chạy`}
          description="Chỉ hiển thị các lớp running hiện đang gán cho bạn."
        >
          {section.assignedClasses.length === 0 ? (
            <EmptyState
              title="Chưa có lớp đang chạy"
              description="Khi có lớp được gán, danh sách sẽ xuất hiện ở đây."
            />
          ) : (
            <div className="space-y-3">
              {section.assignedClasses.map((item) => (
                <Link
                  key={item.id}
                  href={`/staff/classes/${encodeURIComponent(item.id)}`}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-border-default bg-bg-secondary/20 p-4 transition-colors hover:bg-bg-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {item.studentCount} học sinh • {item.scheduleCount} khung giờ •{" "}
                      {item.surveyCount} khảo sát
                    </p>
                  </div>
                  <span className="text-xs font-medium text-primary">Mở lớp</span>
                </Link>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard
          eyebrow="Cảnh báo lớp"
          title="Lớp chưa điền lịch hoặc khảo sát"
          description="Ưu tiên các lớp đang thiếu dữ liệu vận hành để xử lý sớm."
        >
          {section.missingScheduleOrSurvey.length === 0 ? (
            <EmptyState
              title="Không có lớp cần nhắc"
              description="Tất cả lớp phụ trách hiện đã có lịch và trạng thái khảo sát phù hợp."
            />
          ) : (
            <div className="space-y-3">
              {section.missingScheduleOrSurvey.map((item) => (
                <Link
                  key={item.classId}
                  href={`/staff/classes/${encodeURIComponent(item.classId)}`}
                  className="block rounded-2xl border border-border-default bg-bg-secondary/20 p-4 transition-colors hover:bg-bg-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <p className="text-sm font-semibold text-text-primary">
                    {item.className}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    {item.reason}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard
          eyebrow="Hôm nay"
          title="Lịch dạy trong ngày"
          description="Lấy trực tiếp từ các session có ngày học là hôm nay."
        >
          {section.todaySessions.length === 0 ? (
            <EmptyState
              title="Hôm nay chưa có buổi dạy"
              description="Khi có session trong ngày, lịch sẽ hiển thị ở đây."
            />
          ) : (
            <div className="space-y-3">
              {section.todaySessions.map((session) => (
                <Link
                  key={session.sessionId}
                  href={`/staff/classes/${encodeURIComponent(session.classId)}`}
                  className="block rounded-2xl border border-border-default bg-bg-secondary/20 p-4 transition-colors hover:bg-bg-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {session.className}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {formatTimeRange(session.startTime, session.endTime)}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-primary">
                      {session.attendanceCount} học sinh
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-text-muted">
                    {SESSION_PAYMENT_STATUS_LABELS[session.teacherPaymentStatus ?? ""] ??
                      "Theo dõi trong lớp"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </SurfaceCard>
      </div>
    </section>
  );
}

function LessonPlanSection({
  section,
}: {
  section: StaffDashboardLessonPlanSection;
}) {
  return (
    <section className="space-y-3">
      <SectionTitle
        role="lesson_plan"
        description="Tóm tắt tiến độ task giáo án được giao và các việc còn mở."
        href="/staff/lesson-plans"
        linkLabel="Mở workspace giáo án"
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <SurfaceCard
          eyebrow="Tiến độ task"
          title="Tổng quan xử lý giáo án"
          description="Số liệu chỉ tính trên các task bạn đang được assign."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStat
              label="Tổng task"
              value={String(section.totalTaskCount)}
              tone="primary"
            />
            <MiniStat
              label="Đã hoàn thành"
              value={String(section.completedTaskCount)}
              tone="success"
            />
            <MiniStat
              label="Còn lại"
              value={String(section.remainingTaskCount)}
              tone="warning"
            />
          </div>
        </SurfaceCard>

        <SurfaceCard
          eyebrow="Task còn mở"
          title="Việc cần xử lý tiếp"
          description="Bấm vào từng task để mở chi tiết và tiếp tục cập nhật output."
        >
          <TaskList
            tasks={section.openTasks}
            hrefBuilder={(taskId) =>
              `/staff/lesson-plans/tasks/${encodeURIComponent(taskId)}`
            }
            emptyTitle="Không còn task mở"
            emptyDescription="Tất cả task hiện tại của bạn đã hoàn thành hoặc chưa có assignment."
          />
        </SurfaceCard>
      </div>
    </section>
  );
}

function LessonPlanHeadSection({
  section,
  monthLabel,
}: {
  section: StaffDashboardLessonPlanHeadSection;
  monthLabel: string;
}) {
  return (
    <section className="space-y-3">
      <SectionTitle
        role="lesson_plan_head"
        description={`Theo dõi các task chưa hoàn thành và tổng sản lượng giáo án mới trong ${monthLabel}.`}
        href="/staff/lesson-plans"
        linkLabel="Mở quản lí giáo án"
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <SurfaceCard
          eyebrow="Task chưa xong"
          title="Cảnh báo tiến độ"
          description="Danh sách ưu tiên các task còn pending hoặc in progress."
        >
          <TaskList
            tasks={section.incompleteTasks}
            hrefBuilder={(taskId) =>
              `/staff/lesson-plans/tasks/${encodeURIComponent(taskId)}`
            }
            emptyTitle="Không còn task tồn đọng"
            emptyDescription="Hiện không có task giáo án nào cần nhắc thêm."
          />
        </SurfaceCard>

        <SurfaceCard
          eyebrow="Sản lượng"
          title="Tổng hợp bài giáo án"
          description="Tính theo lesson output đã tạo trên toàn module."
        >
          <div className="grid gap-3">
            <MiniStat
              label="Tổng số bài"
              value={String(section.lessonOutputTotals.totalOutputs)}
              tone="primary"
            />
            <MiniStat
              label="Bài mới tháng này"
              value={String(section.lessonOutputTotals.newOutputsThisMonth)}
              tone="success"
            />
            <MiniStat
              label="Bài mới tuần này"
              value={String(section.lessonOutputTotals.newOutputsThisWeek)}
              tone="warning"
            />
          </div>
        </SurfaceCard>
      </div>
    </section>
  );
}

function AssistantSection({
  section,
}: {
  section: StaffDashboardAssistantSection;
}) {
  return (
    <section className="space-y-3">
      <SectionTitle
        role="assistant"
        description="Hiển thị các cảnh báo hành động, summary hệ thống và hiệu quả theo từng bạn CSKH."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <SurfaceCard
          eyebrow="Hành động"
          title="Cảnh báo cần xử lý"
          description="Dùng cùng nguồn dữ liệu aggregate của admin dashboard, nhưng hiển thị ngay trong staff shell."
        >
          {section.actionAlerts.length === 0 ? (
            <EmptyState
              title="Không có cảnh báo mở"
              description="Hiện chưa có mục nào cần trợ lí xử lý thêm."
            />
          ) : (
            <div className="space-y-3">
              {section.actionAlerts.slice(0, 6).map((alert) => {
                const href = getAlertHref(alert);

                const content = (
                  <div className="rounded-2xl border border-border-default bg-bg-secondary/20 p-4 transition-colors hover:bg-bg-secondary/45">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-primary">
                          {alert.subject}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {alert.type} • {alert.owner ?? alert.due}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-primary">
                        {formatCurrency(alert.amount)}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-text-muted">{alert.due}</p>
                  </div>
                );

                return href ? (
                  <Link
                    key={`${alert.targetType}-${alert.targetId}-${alert.subject}`}
                    href={href}
                    className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={`${alert.targetType}-${alert.targetId}-${alert.subject}`}>
                    {content}
                  </div>
                );
              })}
            </div>
          )}
        </SurfaceCard>

        <div className="space-y-4">
          <SurfaceCard
            eyebrow="Summary hệ thống"
            title="Lớp, học sinh, giáo viên"
            description="Chỉ giữ các chỉ số vận hành chính, không hiển thị số tài chính ở khối này."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat
                label="Lớp đang chạy"
                value={String(section.systemSummary.activeClasses)}
                tone="primary"
              />
              <MiniStat
                label="Học sinh active"
                value={String(section.systemSummary.activeStudents)}
                tone="success"
              />
              <MiniStat
                label="Giáo viên active"
                value={String(section.systemSummary.activeTeachers)}
                tone="warning"
              />
            </div>
          </SurfaceCard>

          <SurfaceCard
            eyebrow="Theo CSKH"
            title="Doanh thu và học phí theo nhân sự CSKH"
            description="Tổng học phí = phần học sinh đã học. Tổng doanh thu = phần học sinh đã nạp."
          >
            {section.customerCarePortfolios.length === 0 ? (
              <EmptyState
                title="Chưa có dữ liệu CSKH"
                description="Khi có nhân sự CSKH phụ trách học sinh, số liệu sẽ hiện ở đây."
              />
            ) : (
              <div className="space-y-3">
                {section.customerCarePortfolios.map((item) => (
                  <Link
                    key={item.staffId}
                    href={`/staff/customer-care-detail/${encodeURIComponent(item.staffId)}`}
                    className="block rounded-2xl border border-border-default bg-bg-secondary/20 p-4 transition-colors hover:bg-bg-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">
                          {item.staffName}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {item.activeStudentCount} học sinh đang chăm sóc
                        </p>
                      </div>
                      <span className="text-xs font-medium text-primary">
                        Mở chi tiết
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <MiniStat
                        label="Học phí đã học"
                        value={formatCurrency(item.learnedTuitionTotal)}
                        tone="success"
                      />
                      <MiniStat
                        label="Doanh thu đã nạp"
                        value={formatCurrency(item.topupTotal)}
                        tone="primary"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>
    </section>
  );
}

function StudentAlertList({
  items,
  emptyTitle,
  emptyDescription,
}: {
  items: StaffDashboardCustomerCareSection["lowBalanceStudents"];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link
          key={item.studentId}
          href={`/staff/students/${encodeURIComponent(item.studentId)}`}
          className="block rounded-2xl border border-border-default bg-bg-secondary/20 p-4 transition-colors hover:bg-bg-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                {item.studentName}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {item.classNames || "Chưa có lớp running"}
              </p>
            </div>
            <span className="text-xs font-semibold text-primary">
              {formatCurrency(item.accountBalance)}
            </span>
          </div>
          <p className="mt-3 text-xs text-text-muted">{item.dueLabel}</p>
        </Link>
      ))}
    </div>
  );
}

function CustomerCareSection({
  section,
  monthLabel,
}: {
  section: StaffDashboardCustomerCareSection;
  monthLabel: string;
}) {
  return (
    <section className="space-y-3">
      <SectionTitle
        role="customer_care"
        description={`Theo dõi biến động học sinh trong ${monthLabel}, quy mô chăm sóc hiện tại và các cảnh báo số dư.`}
        href="/staff/customer-care-detail"
        linkLabel="Mở chi tiết CSKH"
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <SurfaceCard
          eyebrow="Danh mục chính"
          title="Tổng hợp CSKH"
          description="Tổng doanh thu = học sinh đã nạp. Tổng học phí = các buổi học đã diễn ra."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniStat
              label="Học sinh mới tháng này"
              value={String(section.newStudentsThisMonth)}
              tone="primary"
            />
            <MiniStat
              label="Học sinh nghỉ tháng này"
              value={String(section.droppedStudentsThisMonth)}
              tone="warning"
            />
            <MiniStat
              label="Đang chăm sóc"
              value={String(section.activeStudentsCount)}
              tone="success"
            />
            <MiniStat
              label="Tổng học phí"
              value={formatCurrency(section.learnedTuitionTotal)}
              tone="success"
            />
            <MiniStat
              label="Tổng doanh thu"
              value={formatCurrency(section.topupTotal)}
              tone="primary"
            />
          </div>
        </SurfaceCard>

        <SurfaceCard
          eyebrow="Số dư thấp"
          title="Học sinh cần follow-up sớm"
          description="Các học sinh còn ít buổi học khả dụng theo số dư hiện tại."
        >
          <StudentAlertList
            items={section.lowBalanceStudents}
            emptyTitle="Không có học sinh sắp hết tiền"
            emptyDescription="Danh sách sẽ xuất hiện khi có học sinh còn ít buổi học."
          />
        </SurfaceCard>

        <SurfaceCard
          eyebrow="Công nợ"
          title="Học sinh đang nợ tiền"
          description="Ưu tiên xử lý các học sinh có số dư âm."
        >
          <StudentAlertList
            items={section.debtStudents}
            emptyTitle="Không có học sinh nợ tiền"
            emptyDescription="Hiện chưa có học sinh nào âm ví trong phạm vi bạn đang chăm sóc."
          />
        </SurfaceCard>
      </div>
    </section>
  );
}

function UnpaidStaffList({
  items,
}: {
  items: StaffDashboardUnpaidStaffItem[];
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Không có khoản pending"
        description="Hiện chưa có nhân sự nào còn khoản chưa thanh toán."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const parts = [
          item.sessionAmount > 0 ? `Buổi dạy ${formatCurrency(item.sessionAmount)}` : null,
          item.customerCareAmount > 0 ? `CSKH ${formatCurrency(item.customerCareAmount)}` : null,
          item.lessonAmount > 0 ? `Giáo án ${formatCurrency(item.lessonAmount)}` : null,
          item.bonusAmount > 0 ? `Bonus ${formatCurrency(item.bonusAmount)}` : null,
          item.extraAllowanceAmount > 0 ? `Trợ cấp ${formatCurrency(item.extraAllowanceAmount)}` : null,
        ].filter((value): value is string => value != null);

        return (
          <div
            key={item.staffId}
            className="rounded-2xl border border-border-default bg-bg-secondary/20 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {item.staffName}
                </p>
                <p className="mt-1 text-xs leading-6 text-text-secondary">
                  {parts.length > 0 ? parts.join(" • ") : "Chưa có chi tiết nguồn pending."}
                </p>
              </div>
              <span className="text-sm font-semibold text-error">
                {formatCurrency(item.totalUnpaid)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AccountantSection({
  section,
}: {
  section: StaffDashboardAccountantSection;
}) {
  const financialRows = [
    {
      label: "Tổng nạp tháng",
      value: section.financialOverview.summary.monthlyTopupTotal,
      tone: "primary" as const,
    },
    {
      label: "Học phí đã học",
      value: section.financialOverview.summary.totalLearnedTuition,
      tone: "success" as const,
    },
    {
      label: "Chưa thu",
      value: section.financialOverview.summary.pendingCollectionTotal,
      tone: "warning" as const,
    },
    {
      label: "Chờ thanh toán",
      value: section.financialOverview.summary.pendingPayrollTotal,
      tone: "danger" as const,
    },
    {
      label: "Lợi nhuận tháng",
      value: section.financialOverview.summary.monthlyProfit,
      tone:
        section.financialOverview.summary.monthlyProfit >= 0
          ? ("success" as const)
          : ("danger" as const),
    },
  ];

  return (
    <section className="space-y-3">
      <SectionTitle
        role="accountant"
        description="Ưu tiên các khoản pending và giữ một bản tóm tắt tài chính tương đương dashboard admin ngay trong staff shell."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <SurfaceCard
          eyebrow="Báo cáo tài chính"
          title={`Số liệu ${section.financialOverview.period.monthLabel}`}
          description="Các chỉ số bên dưới tái dùng đúng nguồn aggregate tài chính đang có ở admin dashboard."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {financialRows.map((item) => (
              <MiniStat
                key={item.label}
                label={item.label}
                value={formatCurrency(item.value)}
                tone={item.tone}
              />
            ))}
          </div>
          <div className="mt-4 space-y-3 rounded-2xl border border-border-default bg-bg-secondary/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Cơ cấu doanh thu / chi phí
            </p>
            <div className="space-y-3">
              {section.financialOverview.breakdown.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border-default bg-bg-surface px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {item.kind === "revenue" ? "Nguồn thu" : "Nguồn chi"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-text-primary">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard
          eyebrow="Cảnh báo thanh toán"
          title="Nhân sự còn khoản pending"
          description="Tổng hợp các khoản chưa thanh toán theo từng nhân sự để kế toán xử lý."
        >
          <UnpaidStaffList items={section.unpaidStaff} />
        </SurfaceCard>
      </div>
    </section>
  );
}

function RootLoadingState() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6" aria-busy="true">
      <div className="rounded-[2rem] border border-border-default bg-bg-surface p-5 shadow-sm">
        <div className="h-3 w-32 animate-pulse rounded-full bg-bg-tertiary" />
        <div className="mt-4 h-10 w-64 animate-pulse rounded-2xl bg-bg-tertiary" />
        <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded bg-bg-tertiary" />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`staff-dashboard-loading-metric-${index}`}
              className="h-24 animate-pulse rounded-2xl border border-border-default bg-bg-secondary/55"
            />
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`staff-dashboard-loading-card-${index}`}
            className="h-72 animate-pulse rounded-[1.5rem] border border-border-default bg-bg-surface"
          />
        ))}
      </div>
    </div>
  );
}

export default function StaffDashboardPage() {
  const { month, year } = getCurrentMonth();
  const monthLabel = formatMonthLabel(month, year);

  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
  } = useQuery({
    queryKey: ["auth", "full-profile"],
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });

  const linkedStaffId = profile?.staffInfo?.id ?? "";
  const staffRoles = profile?.staffInfo?.roles ?? [];
  const isAssistant =
    (profile?.roleType === "staff" || profile?.roleType === "admin") &&
    staffRoles.includes("assistant");

  const incomeQuery = useQuery({
    queryKey: ["staff", "self", "income-summary", year, month, RECENT_UNPAID_DAYS],
    queryFn: () =>
      getMyStaffIncomeSummary({
        month,
        year,
        days: RECENT_UNPAID_DAYS,
      }),
    enabled: !!linkedStaffId,
    staleTime: 30_000,
  });

  const dashboardQuery = useQuery<StaffDashboardDto>({
    queryKey: ["staff", "self", "dashboard", year, month],
    queryFn: () =>
      getMyStaffDashboard({
        month,
        year,
      }),
    enabled: !!linkedStaffId,
    staleTime: 30_000,
  });

  if (
    isProfileLoading ||
    (linkedStaffId &&
      (incomeQuery.isLoading || dashboardQuery.isLoading) &&
      !incomeQuery.data &&
      !dashboardQuery.data)
  ) {
    return <RootLoadingState />;
  }

  if (isProfileError || !profile?.staffInfo?.id) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6">
        <SurfaceCard
          eyebrow="Staff Dashboard"
          title="Không tải được hồ sơ staff"
          description={getErrorMessage(
            profileError,
            "Tài khoản hiện tại chưa có hồ sơ nhân sự hợp lệ để mở dashboard.",
          )}
        >
          <EmptyState
            title="Dashboard chưa sẵn sàng"
            description="Kiểm tra lại linked staff profile của tài khoản hiện tại trước khi tiếp tục."
          />
        </SurfaceCard>
      </div>
    );
  }

  const staffName =
    profile.staffInfo.fullName?.trim() || profile.email || "Nhân sự";
  const incomeSummary = incomeQuery.data;
  const monthlyTotals = incomeSummary?.monthlyIncomeTotals ?? {
    total: 0,
    paid: 0,
    unpaid: 0,
  };
  const dashboard = dashboardQuery.data;
  const hasLessonPlanHead = staffRoles.includes("lesson_plan_head");
  const hasLessonPlan = staffRoles.includes("lesson_plan") && !hasLessonPlanHead;
  const hasExtraSections =
    staffRoles.includes("teacher") ||
    hasLessonPlan ||
    hasLessonPlanHead ||
    staffRoles.includes("assistant") ||
    staffRoles.includes("customer_care") ||
    staffRoles.includes("accountant");

  const incomeDetailHref =
    isAssistant && linkedStaffId
      ? `/staff/staffs/${encodeURIComponent(linkedStaffId)}`
      : "/staff/profile";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-border-default bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(246,250,252,0.94))] p-5 shadow-sm sm:p-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] xl:items-start">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
                Staff Dashboard
              </p>
              <h1 className="mt-3 text-balance text-2xl font-semibold tracking-[-0.03em] text-text-primary sm:text-3xl">
                Xin chào, {staffName}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">
                Dashboard này chỉ hiển thị các khối đúng với quyền hiện tại của bạn. Các số liệu tổng hợp
                đều lấy từ backend để tránh lệch logic nghiệp vụ ở frontend.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {staffRoles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20"
                  >
                    {ROLE_LABELS[role] ?? role}
                  </span>
                ))}
                <span className="inline-flex rounded-full bg-bg-surface px-3 py-1 text-xs font-medium text-text-secondary ring-1 ring-border-default">
                  {monthLabel}
                </span>
              </div>
            </div>

            <SurfaceCard
              eyebrow="Chung"
              title="Thu nhập tháng"
              description="Lấy trực tiếp từ self-service income summary của staff hiện tại."
              action={
                <Link
                  href={incomeDetailHref}
                  className="inline-flex min-h-11 items-center rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Xem chi tiết
                </Link>
              }
            >
              {incomeQuery.isError ? (
                <EmptyState
                  title="Không tải được thu nhập tháng"
                  description={getErrorMessage(
                    incomeQuery.error,
                    "Dữ liệu thu nhập hiện chưa lấy được từ backend.",
                  )}
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <MiniStat
                    label="Lương tổng"
                    value={formatCurrency(monthlyTotals.total)}
                    tone="primary"
                  />
                  <MiniStat
                    label="Đã nhận"
                    value={formatCurrency(monthlyTotals.paid)}
                    tone="success"
                  />
                  <MiniStat
                    label="Chưa nhận"
                    value={formatCurrency(monthlyTotals.unpaid)}
                    tone="warning"
                  />
                </div>
              )}
            </SurfaceCard>
          </div>
        </section>

        {dashboardQuery.isError ? (
          <SurfaceCard
            eyebrow="Role-Aware"
            title="Không tải được dashboard theo role"
            description={getErrorMessage(
              dashboardQuery.error,
              "Payload dashboard theo quyền hiện tại đang lỗi.",
            )}
          >
            <EmptyState
              title="Phần role-specific đang tạm unavailable"
              description="Khối thu nhập tháng vẫn dùng được, nhưng các thẻ theo role chưa lấy được dữ liệu."
            />
          </SurfaceCard>
        ) : (
          <>
            {staffRoles.includes("teacher") && dashboard?.teacher ? (
              <TeacherSection section={dashboard.teacher} monthLabel={monthLabel} />
            ) : null}

            {hasLessonPlan && dashboard?.lessonPlan ? (
              <LessonPlanSection section={dashboard.lessonPlan} />
            ) : null}

            {hasLessonPlanHead && dashboard?.lessonPlanHead ? (
              <LessonPlanHeadSection
                section={dashboard.lessonPlanHead}
                monthLabel={monthLabel}
              />
            ) : null}

            {staffRoles.includes("assistant") && dashboard?.assistant ? (
              <AssistantSection section={dashboard.assistant} />
            ) : null}

            {staffRoles.includes("customer_care") && dashboard?.customerCare ? (
              <CustomerCareSection
                section={dashboard.customerCare}
                monthLabel={monthLabel}
              />
            ) : null}

            {staffRoles.includes("accountant") && dashboard?.accountant ? (
              <AccountantSection section={dashboard.accountant} />
            ) : null}

            {!hasExtraSections ? (
              <SurfaceCard
                eyebrow="Role-Aware"
                title="Hiện chưa có thẻ riêng cho role này"
                description="Dashboard gốc vẫn giữ phần thu nhập tháng, còn các khối mở rộng sẽ được bổ sung sau nếu role của bạn cần thêm số liệu vận hành."
              >
                <EmptyState
                  title="Chỉ hiển thị khối chung"
                  description="Role hiện tại của bạn chưa có thẻ dashboard chuyên biệt ngoài phần thu nhập tháng."
                />
              </SurfaceCard>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
