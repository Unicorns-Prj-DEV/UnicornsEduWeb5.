"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import LessonOutputFormPopup from "@/components/admin/lesson-plans/LessonOutputFormPopup";
import LessonTaskFormPopup from "@/components/admin/lesson-plans/LessonTaskFormPopup";
import {
  formatLessonDateOnly,
  formatLessonStaffRoleLabel,
  formatLessonStaffStatusLabel,
  LESSON_OUTPUT_STATUS_LABELS,
  LESSON_TASK_PRIORITY_LABELS,
  LESSON_TASK_STATUS_LABELS,
  lessonOutputStatusChipClass,
  lessonTaskPriorityChipClass,
  lessonTaskStatusChipClass,
} from "@/components/admin/lesson-plans/lessonTaskUi";
import type {
  CreateLessonOutputPayload,
  CreateLessonTaskPayload,
  LessonTaskDetail,
  LessonTaskItem,
} from "@/dtos/lesson.dto";
import * as lessonApi from "@/lib/apis/lesson.api";

function normalizePositiveInt(value: string | null, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function normalizeTab(value: string | null) {
  if (value === "work" || value === "exercises") {
    return value;
  }

  return "overview";
}

function getErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ??
    (error as Error)?.message ??
    fallback
  );
}

function TaskMetaCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="rounded-[1.4rem] border border-border-default bg-bg-surface p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold text-text-primary">{value}</p>
      <p className="mt-1 text-sm text-text-secondary">{hint}</p>
    </article>
  );
}

function StaffCard({
  staff,
}: {
  staff: NonNullable<LessonTaskItem["createdByStaff"]>;
}) {
  return (
    <article className="rounded-[1.35rem] border border-border-default bg-bg-secondary/55 p-4">
      <p className="text-sm font-semibold text-text-primary">{staff.fullName}</p>
      <p className="mt-1 text-sm text-text-secondary">
        {formatLessonStaffRoleLabel(staff.roles)}
      </p>
      <p className="mt-2 text-xs text-text-muted">
        {formatLessonStaffStatusLabel(staff.status)}
      </p>
    </article>
  );
}

export default function AdminLessonTaskDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const taskId = typeof params?.taskId === "string" ? params.taskId : "";
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [createOutputOpen, setCreateOutputOpen] = useState(false);

  const backHref = useMemo(() => {
    const nextParams = new URLSearchParams();
    nextParams.set("tab", normalizeTab(searchParams.get("tab")));
    nextParams.set(
      "resourcePage",
      String(normalizePositiveInt(searchParams.get("resourcePage"))),
    );
    nextParams.set(
      "taskPage",
      String(normalizePositiveInt(searchParams.get("taskPage"))),
    );
    nextParams.set(
      "workPage",
      String(normalizePositiveInt(searchParams.get("workPage"))),
    );
    return `/admin/lesson-plans?${nextParams.toString()}`;
  }, [searchParams]);

  const buildOutputHref = (outputId: string) => {
    const nextParams = new URLSearchParams();
    nextParams.set("tab", normalizeTab(searchParams.get("tab")));
    nextParams.set(
      "resourcePage",
      String(normalizePositiveInt(searchParams.get("resourcePage"))),
    );
    nextParams.set(
      "taskPage",
      String(normalizePositiveInt(searchParams.get("taskPage"))),
    );
    nextParams.set(
      "workPage",
      String(normalizePositiveInt(searchParams.get("workPage"))),
    );
    nextParams.set("taskId", taskId);
    nextParams.set("origin", "task");

    return `/admin/lesson-plans/outputs/${encodeURIComponent(outputId)}?${nextParams.toString()}`;
  };

  const {
    data: task,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<LessonTaskDetail>({
    queryKey: ["lesson", "task", taskId],
    queryFn: () => lessonApi.getLessonTaskById(taskId),
    enabled: !!taskId,
  });

  const updateTaskMutation = useMutation({
    mutationFn: (payload: CreateLessonTaskPayload) =>
      lessonApi.updateLessonTask(taskId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lesson"] });
      toast.success("Đã cập nhật chi tiết công việc giáo án.");
      setEditPopupOpen(false);
    },
    onError: (mutationError) => {
      toast.error(
        getErrorMessage(mutationError, "Không thể cập nhật công việc."),
      );
    },
  });

  const createOutputMutation = useMutation({
    mutationFn: lessonApi.createLessonOutput,
    onSuccess: async (createdOutput) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lesson", "work"] }),
        queryClient.invalidateQueries({ queryKey: ["lesson", "exercises"] }),
        queryClient.invalidateQueries({
          queryKey: ["lesson", "task", createdOutput.lessonTaskId],
        }),
      ]);
      toast.success("Đã tạo lesson output mới.");
      setCreateOutputOpen(false);
    },
    onError: (mutationError) => {
      toast.error(
        getErrorMessage(mutationError, "Không thể tạo lesson output."),
      );
    },
  });

  const handleSubmit = async (payload: CreateLessonTaskPayload) => {
    await updateTaskMutation.mutateAsync(payload);
  };

  const handleCreateOutput = async (payload: CreateLessonOutputPayload) => {
    await createOutputMutation.mutateAsync(payload);
  };

  if (!taskId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
        <div className="mx-auto w-full max-w-5xl rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm">
          <p className="text-base font-semibold text-text-primary">
            Không tìm thấy công việc giáo án.
          </p>
          <Link
            href={backHref}
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Quay lại trang giáo án
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 pb-8 sm:p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:rounded-lg sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-default bg-bg-secondary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Quay lại Giáo Án
          </Link>
        </div>

        {isLoading ? (
          <>
            <section className="rounded-[2rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
              <div className="h-4 w-32 animate-pulse rounded-full bg-bg-tertiary" />
              <div className="mt-4 h-10 w-2/3 animate-pulse rounded-2xl bg-bg-tertiary" />
              <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-bg-tertiary" />
              <div className="mt-2 h-4 w-5/6 animate-pulse rounded-full bg-bg-tertiary" />
            </section>
            <div className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-[1.4rem] border border-border-default bg-bg-surface"
                />
              ))}
            </div>
          </>
        ) : isError || !task ? (
          <section className="rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
            <div className="rounded-[1.5rem] border border-dashed border-border-default bg-bg-secondary/40 px-5 py-12 text-center">
              <p className="text-base font-semibold text-text-primary">
                Không tải được chi tiết công việc.
              </p>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                {getErrorMessage(error, "Đã có lỗi khi tải dữ liệu công việc.")}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Tải lại
                </button>
                <Link
                  href={backHref}
                  className="rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Trở về Giáo Án
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="relative overflow-hidden rounded-[2rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.14),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_30%)]"
                aria-hidden
              />

              <div className="relative flex flex-col gap-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
                      Chi tiết công việc giáo án
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary text-balance sm:text-4xl">
                      {task.title ?? "Công việc chưa đặt tên"}
                    </h1>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonTaskStatusChipClass(
                          task.status,
                        )}`}
                      >
                        {LESSON_TASK_STATUS_LABELS[task.status]}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonTaskPriorityChipClass(
                          task.priority,
                        )}`}
                      >
                        {LESSON_TASK_PRIORITY_LABELS[task.priority]}
                      </span>
                    </div>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-text-secondary">
                      {task.description?.trim() ||
                        "Chưa có mô tả chi tiết — mở chỉnh sửa để bổ sung."}
                    </p>
                  </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditPopupOpen(true)}
                    className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      Chỉnh sửa công việc
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <TaskMetaCard
                    label="Hạn xử lý"
                    value={formatLessonDateOnly(task.dueDate)}
                    hint="Ngày hệ thống đang dùng để điều phối nhịp xử lý."
                  />
                  <TaskMetaCard
                    label="Phụ trách"
                    value={task.createdByStaff?.fullName ?? "Chưa khóa cụ thể"}
                    hint="Có thể thay đổi trực tiếp trong popup chỉnh sửa."
                  />
                  <TaskMetaCard
                    label="Nhân sự tham gia"
                    value={`${task.assignees.length} người`}
                    hint="Tối đa 3 người thực hiện cho mỗi task."
                  />
                </div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <section className="rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                      Ownership
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-text-primary">
                      Người chịu trách nhiệm
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      Nhân sự đang đứng tên phụ trách và chịu ownership chính của
                      task này.
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  {task.createdByStaff ? (
                    <StaffCard staff={task.createdByStaff} />
                  ) : (
                    <div className="rounded-[1.35rem] border border-dashed border-border-default bg-bg-secondary/40 px-4 py-8 text-sm text-text-muted">
                      Chưa gán người phụ trách cụ thể. Mở popup chỉnh sửa để chọn
                      lại.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                    Execution
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-text-primary">
                    Nhân sự thực hiện
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    Danh sách nhân sự đang được giao tham gia xử lý task này.
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {task.assignees.length > 0 ? (
                    task.assignees.map((assignee) => (
                      <StaffCard key={assignee.id} staff={assignee} />
                    ))
                  ) : (
                    <div className="rounded-[1.35rem] border border-dashed border-border-default bg-bg-secondary/40 px-4 py-8 text-sm text-text-muted">
                      Chưa có nhân sự thực hiện. Có thể gắn ngay trong popup chỉnh
                      sửa.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                    Ghi chú
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-text-primary">
                    Mô tả và ngữ cảnh
                  </h2>
                </div>
                <p className="text-xs text-text-muted">Mã: {task.id}</p>
              </div>

              <div className="mt-4 rounded-[1.35rem] border border-border-default bg-bg-secondary/45 p-4">
                <p className="whitespace-pre-wrap text-sm leading-7 text-text-secondary">
                  {task.description?.trim() ||
                    "Chưa có mô tả chi tiết."}
                </p>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <section className="rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                      Sản phẩm
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-text-primary">
                      Sản phẩm bài học
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      Danh sách sản phẩm thuộc công việc này; có thể tạo thêm sản
                      phẩm mới tại đây.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-text-secondary">
                      {task.outputProgress.completed}/{task.outputProgress.total} hoàn
                      thành
                    </p>
                    <button
                      type="button"
                      onClick={() => setCreateOutputOpen(true)}
                      className="inline-flex min-h-11 items-center rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      Tạo sản phẩm
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {task.outputs.length > 0 ? (
                    task.outputs.map((output) => (
                      <Link
                        key={output.id}
                        href={buildOutputHref(output.id)}
                        className="flex flex-col gap-3 rounded-[1.35rem] border border-border-default bg-bg-secondary/45 p-4 transition-colors hover:bg-bg-secondary/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-text-primary">
                              {output.lessonName}
                            </p>
                            <p className="mt-1 text-sm text-text-secondary">
                              {output.contestUploaded ?? "Chưa ghi cuộc thi/đề"}
                            </p>
                          </div>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonOutputStatusChipClass(
                              output.status,
                            )}`}
                          >
                            {LESSON_OUTPUT_STATUS_LABELS[output.status]}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                          <span>Ngày: {formatLessonDateOnly(output.date)}</span>
                          <span>
                            Nhân sự:{" "}
                            {output.staffDisplayName ?? output.staffId ?? "Chưa gán"}
                          </span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-[1.35rem] border border-dashed border-border-default bg-bg-secondary/40 px-4 py-8 text-sm text-text-muted">
                      Chưa có sản phẩm bài học nào.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                    Tài nguyên
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-text-primary">
                    Tài nguyên liên quan
                  </h2>
                </div>

                <div className="mt-4 space-y-3">
                  {task.resourcePreview.length > 0 ? (
                    task.resourcePreview.map((resource) => (
                      <a
                        key={resource.id}
                        href={resource.resourceLink}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-[1.35rem] border border-border-default bg-bg-secondary/45 px-4 py-4 text-sm text-primary transition-colors hover:bg-bg-secondary/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        <span className="block truncate">
                          {resource.title ?? resource.resourceLink}
                        </span>
                      </a>
                    ))
                  ) : (
                    <div className="rounded-[1.35rem] border border-dashed border-border-default bg-bg-secondary/40 px-4 py-8 text-sm text-text-muted">
                      Chưa có tài nguyên nào gắn với công việc này.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>

      {task ? (
        <>
          <LessonTaskFormPopup
            key={`task-detail-${task.id}-${editPopupOpen ? "open" : "closed"}`}
            open={editPopupOpen}
            mode="edit"
            initialData={task}
            isSubmitting={updateTaskMutation.isPending}
            onClose={() => {
              if (updateTaskMutation.isPending) return;
              setEditPopupOpen(false);
            }}
            onSubmit={handleSubmit}
          />
          <LessonOutputFormPopup
            open={createOutputOpen}
            mode="create"
            task={{
              id: task.id,
              title: task.title,
            }}
            isSubmitting={createOutputMutation.isPending}
            onClose={() => {
              if (createOutputMutation.isPending) return;
              setCreateOutputOpen(false);
            }}
            onSubmit={handleCreateOutput}
          />
        </>
      ) : null}
    </div>
  );
}
