"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { LessonOutputStatus, LessonWorkOutputItem, LessonWorkResponse } from "@/dtos/lesson.dto";
import * as lessonApi from "@/lib/apis/lesson.api";
import {
  formatLessonDateOnly,
  formatLessonDateTime,
  LESSON_OUTPUT_STATUS_LABELS,
  LESSON_TASK_PRIORITY_LABELS,
  LESSON_TASK_STATUS_LABELS,
  lessonOutputStatusChipClass,
  lessonTaskPriorityChipClass,
  lessonTaskStatusChipClass,
} from "./lessonTaskUi";

const WORK_PAGE_SIZE = 6;

function normalizePositiveInt(value: string | null, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function getErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ??
    (error as Error)?.message ??
    fallback
  );
}

function buildOutputHref(outputId: string, workPage: number) {
  const params = new URLSearchParams();
  params.set("tab", "work");
  params.set("workPage", String(workPage));
  return `/admin/lesson-plans/outputs/${encodeURIComponent(outputId)}?${params.toString()}`;
}

function buildTaskHref(taskId: string, workPage: number) {
  const params = new URLSearchParams();
  params.set("tab", "work");
  params.set("workPage", String(workPage));
  return `/admin/lesson-plans/tasks/${encodeURIComponent(taskId)}?${params.toString()}`;
}

function getStatusAccentClass(status: LessonOutputStatus) {
  if (status === "completed") {
    return "bg-success";
  }

  if (status === "cancelled") {
    return "bg-error";
  }

  return "bg-warning";
}

function WorkSummaryCard({
  label,
  value,
  description,
  accentClass,
}: {
  label: string;
  value: number | string;
  description: string;
  accentClass: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-[1.5rem] border border-border-default bg-bg-surface p-4 shadow-sm">
      <div className={`absolute inset-x-0 top-0 h-1 ${accentClass}`} aria-hidden />
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
        {label}
      </p>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-text-primary tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
    </article>
  );
}

function MetaTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-border-default bg-bg-surface/90 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-text-primary">{value}</p>
      <p className="mt-1 text-sm leading-6 text-text-secondary">{hint}</p>
    </div>
  );
}

function FlowChip({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "primary";
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${tone === "primary"
        ? "bg-primary/10 text-primary ring-primary/20"
        : "bg-bg-surface/90 text-text-secondary ring-border-default"
        }`}
    >
      <span className="uppercase tracking-[0.18em] text-[10px] text-text-muted">
        {label}
      </span>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

function WorkPagination({
  page,
  totalPages,
  total,
  isPending,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  isPending: boolean;
  onPageChange: (nextPage: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-text-secondary">{total} output trong desk</p>
        {isPending ? (
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
            Đang chuyển trang
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isPending}
          className="rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          Trước
        </button>
        <span className="rounded-xl border border-border-default bg-bg-secondary px-3 py-2 text-sm font-medium text-text-secondary">
          Trang {page}/{totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isPending}
          className="rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sau
        </button>
      </div>
    </div>
  );
}

function OutputLedgerItem({
  output,
  workPage,
}: {
  output: LessonWorkOutputItem;
  workPage: number;
}) {
  const outputHref = buildOutputHref(output.id, workPage);
  const taskHref = output.task ? buildTaskHref(output.task.id, workPage) : null;

  return (
    <article className="group relative overflow-hidden rounded-[1.6rem] border border-border-default bg-bg-surface shadow-sm transition-colors duration-200 hover:border-border-focus">
      <div
        className={`absolute inset-y-0 left-0 w-1 ${getStatusAccentClass(output.status)}`}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-0 h-28 w-36 bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.12),_transparent_65%)]"
        aria-hidden
      />

      <div className="relative space-y-5 px-4 py-5 sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonOutputStatusChipClass(
                  output.status,
                )}`}
              >
                {LESSON_OUTPUT_STATUS_LABELS[output.status]}
              </span>
              <span className="rounded-full border border-border-default bg-bg-secondary px-3 py-1 text-xs font-medium text-text-secondary">
                Cập nhật {formatLessonDateTime(output.updatedAt)}
              </span>
            </div>

            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
              Lesson Output
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-text-primary text-balance sm:text-2xl">
              {output.lessonName}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              {output.task
                ? "Output này đang được theo dõi như một đơn vị bàn giao độc lập, nhưng vẫn giữ toàn bộ ngữ cảnh từ task cha."
                : "Output này đang được hiển thị độc lập trong output desk và hiện chưa kéo được context task cha."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 xl:w-[13.5rem] xl:flex-col">
            <Link
              href={outputHref}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse shadow-[0_14px_35px_-18px_rgba(37,99,235,0.7)] transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Mở output
            </Link>
            {taskHref ? (
              <Link
                href={taskHref}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                Xem task gốc
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="rounded-[1.35rem] border border-border-default bg-bg-secondary/45 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                  Task Context
                </p>

                {output.task ? (
                  <>
                    <p className="mt-2 text-lg font-semibold text-text-primary">
                      {output.task.title ?? output.task.id}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-text-secondary">
                      Toàn bộ outputs của task này được xem trong route chi tiết
                      task, nơi team cũng tạo output mới và quản lý resource gốc.
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-text-muted">
                    Chưa có thông tin task cha cho output này.
                  </p>
                )}
              </div>

              {output.task ? (
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonTaskStatusChipClass(
                      output.task.status,
                    )}`}
                  >
                    {LESSON_TASK_STATUS_LABELS[output.task.status]}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonTaskPriorityChipClass(
                      output.task.priority,
                    )}`}
                  >
                    {LESSON_TASK_PRIORITY_LABELS[output.task.priority]}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <MetaTile
              label="Contest"
              value={output.contestUploaded?.trim() || "Chưa ghi"}
              hint="Contest uploaded đang gắn cho output."
            />
            <MetaTile
              label="Ngày"
              value={formatLessonDateOnly(output.date)}
              hint="Mốc ngày đang được lưu trong hệ thống."
            />
            <MetaTile
              label="Nhân sự"
              value={output.staffDisplayName ?? output.staffId ?? "Chưa gán"}
              hint="Owner hiện tại của output này."
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export default function LessonWorkTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workPage = normalizePositiveInt(searchParams.get("workPage"));

  const { data, isLoading, isFetching, isError, error, refetch } =
    useQuery<LessonWorkResponse>({
      queryKey: ["lesson", "work", workPage],
      queryFn: () =>
        lessonApi.getLessonWork({
          page: workPage,
          limit: WORK_PAGE_SIZE,
        }),
      placeholderData: (previousData) => previousData,
    });

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tab", "work");
    params.set("workPage", String(Math.max(1, page)));
    router.replace(`/admin/lesson-plans?${params.toString()}`, {
      scroll: false,
    });
  };

  if (isLoading && !data) {
    return (
      <section
        id="lesson-panel-work"
        role="tabpanel"
        aria-labelledby="lesson-tab-work"
        className="space-y-6"
      >
        <div className="h-44 animate-pulse rounded-2xl border border-border-default bg-bg-surface" />
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`work-summary-skeleton-${index}`}
              className="h-32 animate-pulse rounded-[1.5rem] border border-border-default bg-bg-surface"
            />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-[1.75rem] border border-border-default bg-bg-surface" />
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section
        id="lesson-panel-work"
        role="tabpanel"
        aria-labelledby="lesson-tab-work"
        className="space-y-6"
      >
        <section className="rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
          <div className="rounded-[1.5rem] border border-dashed border-border-default bg-bg-secondary/40 px-5 py-12 text-center">
            <p className="text-base font-semibold text-text-primary">
              Không tải được output desk giáo án.
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              {getErrorMessage(error, "Đã có lỗi khi tải tab Công việc.")}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Tải lại
            </button>
          </div>
        </section>
      </section>
    );
  }

  const completionRate =
    data.summary.outputCount > 0
      ? Math.round((data.summary.completedOutputCount / data.summary.outputCount) * 100)
      : 0;

  return (
    <section
      id="lesson-panel-work"
      role="tabpanel"
      aria-labelledby="lesson-tab-work"
      className="space-y-6"
    >
      <div className="grid gap-3 md:grid-cols-4">
        <WorkSummaryCard
          label="Tổng output"
          value={data.summary.outputCount}
          description="Tổng số lesson output đang được desk này theo dõi."
          accentClass="bg-[linear-gradient(90deg,var(--color-primary),transparent)]"
        />
        <WorkSummaryCard
          label="Chưa xong"
          value={data.summary.pendingOutputCount}
          description="Những output còn đang trong hàng xử lý và cần tiếp tục bàn giao."
          accentClass="bg-[linear-gradient(90deg,var(--color-warning),transparent)]"
        />
        <WorkSummaryCard
          label="Hoàn thành"
          value={data.summary.completedOutputCount}
          description="Các output đã chốt xong và có thể dùng như mốc bàn giao."
          accentClass="bg-[linear-gradient(90deg,var(--color-success),transparent)]"
        />
        <WorkSummaryCard
          label="Task nguồn"
          value={data.summary.taskCount}
          description="Số task đang sinh hoặc đã từng sinh output cho desk hiện tại."
          accentClass="bg-[linear-gradient(90deg,var(--color-info),transparent)]"
        />
      </div>

      <section className="rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 border-b border-border-default pb-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                Output Feed
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-text-primary">
                Danh sách outputs độc lập
              </h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Mỗi item hiển thị đầy đủ status, contest, người phụ trách và
                context task cha để đội vận hành quét nhanh toàn bộ nhịp bàn giao.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <FlowChip label="Trang" value={`${data.outputsMeta.page}/${data.outputsMeta.totalPages}`} />
              <FlowChip label="Hiển thị" value={String(data.outputs.length)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text-secondary">
              <span className="size-2 rounded-full bg-warning" aria-hidden />
              Pending lane
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text-secondary">
              <span className="size-2 rounded-full bg-success" aria-hidden />
              Completed lane
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text-secondary">
              <span className="size-2 rounded-full bg-error" aria-hidden />
              Cancelled lane
            </span>
          </div>
        </div>

        <div className="mt-6">
          {data.outputs.length > 0 ? (
            <ul className="space-y-4">
              {data.outputs.map((output) => (
                <li key={output.id}>
                  <OutputLedgerItem output={output} workPage={workPage} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-border-default bg-bg-secondary/35 px-5 py-12 text-center">
              <p className="text-base font-semibold text-text-primary">
                Chưa có lesson output nào.
              </p>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                Hãy mở trang chi tiết của một task để tạo output đầu tiên và bắt
                đầu theo dõi tiến độ bàn giao.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6">
          <WorkPagination
            page={data.outputsMeta.page}
            totalPages={data.outputsMeta.totalPages}
            total={data.outputsMeta.total}
            isPending={isFetching && data.outputsMeta.page !== workPage}
            onPageChange={handlePageChange}
          />
        </div>
      </section>
    </section>
  );
}
