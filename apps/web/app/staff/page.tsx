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
import { resolveCanonicalUserName } from "@/dtos/user-name.dto";
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
    <section className="rounded-2xl border border-border-default bg-bg-surface p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-balance text-base font-semibold leading-tight text-text-primary">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs leading-snug text-text-secondary">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-2.5">{children}</div>
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
    <article className={`rounded-lg border px-2.5 py-2 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums leading-tight text-text-primary">
        {value}
      </p>
    </article>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-default bg-bg-secondary/35 px-3 py-4 text-center">
      <p className="text-sm font-semibold leading-snug text-text-primary">{title}</p>
      <p className="mt-0.5 text-xs leading-snug text-text-muted">{description}</p>
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
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
          {ROLE_LABELS[role] ?? role}
        </p>
        {description ? (
          <p className="mt-0.5 text-xs leading-snug text-text-secondary">{description}</p>
        ) : null}
      </div>
      {href && linkLabel ? (
        <Link
          href={href}
          className="inline-flex min-h-9 items-center rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:min-h-10 sm:px-4 sm:text-sm"
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
    <div className="space-y-2">
      {tasks.map((task) => (
        <Link
          key={task.taskId}
          href={hrefBuilder(task.taskId)}
          className="block rounded-xl border border-border-default bg-bg-secondary/20 p-3 transition-colors hover:bg-bg-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-text-primary">
                {task.title?.trim() || "Task chưa đặt tên"}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
                Phụ trách: {task.responsibleName ?? "Chưa gán"} · Nhân sự:{" "}
                {task.assigneeNames.length > 0 ? task.assigneeNames.join(", ") : "Chưa có"}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${taskStatusClasses(task.status)}`}
              >
                {TASK_STATUS_LABELS[task.status] ?? task.status}
              </span>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${priorityClasses(task.priority)}`}
              >
                {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
              </span>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-text-muted">
            Hạn: {formatShortDate(task.dueDate)}
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
    <section className="space-y-2">
      <SectionTitle role="teacher" href="/staff/profile" linkLabel="Hồ sơ" />
      <div className="grid gap-3 xl:grid-cols-3">
        <SurfaceCard
          eyebrow="Lớp phụ trách"
          title={`${section.assignedClasses.length} lớp đang chạy`}
        >
          {section.assignedClasses.length === 0 ? (
            <EmptyState
              title="Chưa có lớp đang chạy"
              description="Khi có lớp được gán, danh sách sẽ xuất hiện ở đây."
            />
          ) : (
            <div className="space-y-2">
              {section.assignedClasses.map((item) => (
                <Link
                  key={item.id}
                  href={`/staff/classes/${encodeURIComponent(item.id)}`}
                  className="flex items-start justify-between gap-2 rounded-xl border border-border-default bg-bg-secondary/20 p-3 transition-colors hover:bg-bg-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-text-primary">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
                      {item.studentCount} HS · {item.scheduleCount} khung giờ · {item.surveyCount}{" "}
                      khảo sát
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-primary">Mở</span>
                </Link>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard eyebrow="Cảnh báo lớp" title="Thiếu lịch / khảo sát">
          {section.missingScheduleOrSurvey.length === 0 ? (
            <EmptyState
              title="Không có lớp cần nhắc"
              description="Tất cả lớp phụ trách hiện đã có lịch và trạng thái khảo sát phù hợp."
            />
          ) : (
            <div className="space-y-2">
              {section.missingScheduleOrSurvey.map((item) => (
                <Link
                  key={item.classId}
                  href={`/staff/classes/${encodeURIComponent(item.classId)}`}
                  className="block rounded-xl border border-border-default bg-bg-secondary/20 p-3 transition-colors hover:bg-bg-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <p className="text-sm font-semibold leading-snug text-text-primary">
                    {item.className}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-text-secondary">{item.reason}</p>
                </Link>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard eyebrow="Hôm nay" title={`Lịch dạy — ${monthLabel}`}>
          {section.todaySessions.length === 0 ? (
            <EmptyState
              title="Hôm nay chưa có buổi dạy"
              description="Khi có session trong ngày, lịch sẽ hiển thị ở đây."
            />
          ) : (
            <div className="space-y-2">
              {section.todaySessions.map((session) => (
                <Link
                  key={session.sessionId}
                  href={`/staff/classes/${encodeURIComponent(session.classId)}`}
                  className="block rounded-xl border border-border-default bg-bg-secondary/20 p-3 transition-colors hover:bg-bg-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug text-text-primary">
                        {session.className}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
                        {formatTimeRange(session.startTime, session.endTime)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-primary">
                      {session.attendanceCount} HS
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-text-muted">
                    {SESSION_PAYMENT_STATUS_LABELS[session.teacherPaymentStatus ?? ""] ?? "—"}
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
    <section className="space-y-2">
      <SectionTitle role="lesson_plan" href="/staff/lesson-plans" linkLabel="Giáo án" />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <SurfaceCard eyebrow="Tiến độ" title="Task được giao">
          <div className="grid gap-2 sm:grid-cols-3">
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

        <SurfaceCard eyebrow="Mở" title="Task chưa xong">
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
    <section className="space-y-2">
      <SectionTitle role="lesson_plan_head" href="/staff/lesson-plans" linkLabel="Giáo án" />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <SurfaceCard eyebrow="Tiến độ" title="Task chưa hoàn thành">
          <TaskList
            tasks={section.incompleteTasks}
            hrefBuilder={(taskId) =>
              `/staff/lesson-plans/tasks/${encodeURIComponent(taskId)}`
            }
            emptyTitle="Không còn task tồn đọng"
            emptyDescription="Hiện không có task giáo án nào cần nhắc thêm."
          />
        </SurfaceCard>

        <SurfaceCard eyebrow="Sản lượng" title={`Bài giáo án — ${monthLabel}`}>
          <div className="grid gap-2">
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
    <section className="space-y-2">
      <SectionTitle role="assistant" />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <SurfaceCard eyebrow="Hành động" title="Cảnh báo">
          {section.actionAlerts.length === 0 ? (
            <EmptyState
              title="Không có cảnh báo mở"
              description="Hiện chưa có mục nào cần trợ lí xử lý thêm."
            />
          ) : (
            <div className="space-y-2">
              {section.actionAlerts.slice(0, 6).map((alert) => {
                const href = getAlertHref(alert);

                const content = (
                  <div className="rounded-xl border border-border-default bg-bg-secondary/20 p-3 transition-colors hover:bg-bg-secondary/45">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug text-text-primary">
                          {alert.subject}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
                          {alert.type} · {alert.owner ?? alert.due}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-primary">
                        {formatCurrency(alert.amount)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-text-muted">{alert.due}</p>
                  </div>
                );

                return href ? (
                  <Link
                    key={`${alert.targetType}-${alert.targetId}-${alert.subject}`}
                    href={href}
                    className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
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

        <div className="space-y-3">
          <SurfaceCard eyebrow="Vận hành" title="Lớp · HS · GV">
            <div className="grid gap-2 sm:grid-cols-3">
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

          <SurfaceCard eyebrow="CSKH" title="Học phí đã học · Doanh thu nạp">
            {section.customerCarePortfolios.length === 0 ? (
              <EmptyState
                title="Chưa có dữ liệu CSKH"
                description="Khi có nhân sự CSKH phụ trách học sinh, số liệu sẽ hiện ở đây."
              />
            ) : (
              <div className="space-y-2">
                {section.customerCarePortfolios.map((item) => (
                  <Link
                    key={item.staffId}
                    href={`/staff/customer-care-detail/${encodeURIComponent(item.staffId)}`}
                    className="block rounded-xl border border-border-default bg-bg-secondary/20 p-3 transition-colors hover:bg-bg-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-snug text-text-primary">
                          {item.staffName}
                        </p>
                        <p className="mt-0.5 text-[11px] text-text-secondary">
                          {item.activeStudentCount} HS đang chăm sóc
                        </p>
                      </div>
                      <span className="text-[11px] font-medium text-primary">Chi tiết</span>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
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
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.studentId}
          href={`/staff/students/${encodeURIComponent(item.studentId)}`}
          className="block rounded-xl border border-border-default bg-bg-secondary/20 p-3 transition-colors hover:bg-bg-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-text-primary">
                {item.studentName}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
                {item.classNames || "Chưa có lớp"}
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-primary">
              {formatCurrency(item.accountBalance)}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-text-muted">{item.dueLabel}</p>
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
    <section className="space-y-2">
      <SectionTitle
        role="customer_care"
        href="/staff/customer-care-detail"
        linkLabel="Chi tiết CSKH"
      />
      <div className="grid gap-3 xl:grid-cols-3">
        <SurfaceCard eyebrow="Tổng hợp" title={`CSKH — ${monthLabel}`}>
          <div className="grid gap-2 sm:grid-cols-2">
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

        <SurfaceCard eyebrow="Số dư thấp" title="Cần follow-up">
          <StudentAlertList
            items={section.lowBalanceStudents}
            emptyTitle="Không có học sinh sắp hết tiền"
            emptyDescription="Danh sách sẽ xuất hiện khi có học sinh còn ít buổi học."
          />
        </SurfaceCard>

        <SurfaceCard eyebrow="Công nợ" title="Số dư âm">
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
    <div className="space-y-2">
      {items.map((item) => {
        const parts = [
          item.sessionAmount > 0 ? `Buổi ${formatCurrency(item.sessionAmount)}` : null,
          item.customerCareAmount > 0 ? `CSKH ${formatCurrency(item.customerCareAmount)}` : null,
          item.lessonAmount > 0 ? `Giáo án ${formatCurrency(item.lessonAmount)}` : null,
          item.bonusAmount > 0 ? `Bonus ${formatCurrency(item.bonusAmount)}` : null,
          item.extraAllowanceAmount > 0 ? `Trợ cấp ${formatCurrency(item.extraAllowanceAmount)}` : null,
        ].filter((value): value is string => value != null);

        return (
          <div
            key={item.staffId}
            className="rounded-xl border border-border-default bg-bg-secondary/20 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug text-text-primary">
                  {item.staffName}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
                  {parts.length > 0 ? parts.join(" · ") : "—"}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-error">
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
    <section className="space-y-2">
      <SectionTitle role="accountant" />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <SurfaceCard
          eyebrow="Tài chính"
          title={section.financialOverview.period.monthLabel}
        >
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {financialRows.map((item) => (
              <MiniStat
                key={item.label}
                label={item.label}
                value={formatCurrency(item.value)}
                tone={item.tone}
              />
            ))}
          </div>
          <div className="mt-3 space-y-2 rounded-xl border border-border-default bg-bg-secondary/20 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              Thu / chi
            </p>
            <div className="space-y-2">
              {section.financialOverview.breakdown.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border-default bg-bg-surface px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-text-primary">
                      {item.label}
                    </p>
                    <p className="text-[11px] text-text-secondary">
                      {item.kind === "revenue" ? "Thu" : "Chi"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-text-primary">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard eyebrow="Thanh toán" title="Pending theo nhân sự">
          <UnpaidStaffList items={section.unpaidStaff} />
        </SurfaceCard>
      </div>
    </section>
  );
}

function RootLoadingState() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-6 sm:p-5" aria-busy="true">
      <div className="rounded-2xl border border-border-default bg-bg-surface p-4 shadow-sm">
        <div className="h-2.5 w-28 animate-pulse rounded-full bg-bg-tertiary" />
        <div className="mt-3 h-9 w-56 animate-pulse rounded-xl bg-bg-tertiary" />
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`staff-dashboard-loading-metric-${index}`}
              className="h-20 animate-pulse rounded-xl border border-border-default bg-bg-secondary/55"
            />
          ))}
        </div>
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`staff-dashboard-loading-card-${index}`}
            className="h-64 animate-pulse rounded-2xl border border-border-default bg-bg-surface"
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
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-6 sm:p-5">
        <SurfaceCard
          eyebrow="Lỗi"
          title="Không tải hồ sơ nhân sự"
          description={getErrorMessage(
            profileError,
            "Tài khoản chưa có hồ sơ staff hợp lệ.",
          )}
        >
          <EmptyState
            title="Chưa mở được dashboard"
            description="Kiểm tra tài khoản đã liên kết staff."
          />
        </SurfaceCard>
      </div>
    );
  }

  const staffName =
    resolveCanonicalUserName(profile, profile.staffInfo.fullName) ||
    profile.email ||
    "Nhân sự";
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
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-6 sm:p-5">
      <div className="space-y-4">
        <section className="overflow-hidden rounded-2xl border border-border-default bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(246,250,252,0.94))] p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] xl:items-start">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                Staff
              </p>
              <h1 className="mt-1.5 text-balance text-xl font-semibold tracking-tight text-text-primary sm:text-2xl">
                Xin chào, {staffName}
              </h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {staffRoles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex rounded-full bg-primary/12 px-2.5 py-0.5 text-[11px] font-semibold text-primary ring-1 ring-primary/20"
                  >
                    {ROLE_LABELS[role] ?? role}
                  </span>
                ))}
                <span className="inline-flex rounded-full bg-bg-surface px-2.5 py-0.5 text-[11px] font-medium text-text-secondary ring-1 ring-border-default">
                  {monthLabel}
                </span>
              </div>
            </div>

            <SurfaceCard
              eyebrow={monthLabel}
              title="Thu nhập tháng"
              action={
                <Link
                  href={incomeDetailHref}
                  className="inline-flex min-h-9 items-center rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:min-h-10 sm:text-sm"
                >
                  Chi tiết
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
                <div className="grid gap-2 sm:grid-cols-3">
                  <MiniStat
                    label="Thực nhận"
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
            eyebrow="Lỗi"
            title="Không tải dashboard theo role"
            description={getErrorMessage(
              dashboardQuery.error,
              "Payload dashboard theo quyền hiện tại đang lỗi.",
            )}
          >
            <EmptyState
              title="Khối theo role chưa tải được"
              description="Thu nhập tháng vẫn xem được; thử tải lại trang."
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
              <SurfaceCard eyebrow="Dashboard" title="Chưa có thẻ theo role">
                <EmptyState
                  title="Chỉ thu nhập tháng"
                  description="Role này chưa có khối dashboard riêng."
                />
              </SurfaceCard>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
