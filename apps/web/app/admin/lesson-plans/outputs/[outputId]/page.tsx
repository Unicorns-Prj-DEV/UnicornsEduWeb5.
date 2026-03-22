"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import LessonDeleteConfirmPopup from "@/components/admin/lesson-plans/LessonDeleteConfirmPopup";
import LessonOutputEditorForm from "@/components/admin/lesson-plans/LessonOutputEditorForm";
import {
  formatLessonDateOnly,
  formatLessonDateTime,
  formatLessonStaffRoleLabel,
  LESSON_OUTPUT_STATUS_LABELS,
  lessonOutputStatusChipClass,
} from "@/components/admin/lesson-plans/lessonTaskUi";
import type { CreateLessonOutputPayload, LessonOutputItem } from "@/dtos/lesson.dto";
import * as lessonApi from "@/lib/apis/lesson.api";

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

function OutputMetaCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="rounded-[1.35rem] border border-border-default bg-bg-surface p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold text-text-primary">{value}</p>
      <p className="mt-1 text-sm text-text-secondary">{hint}</p>
    </article>
  );
}

export default function AdminLessonOutputDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const outputId = typeof params?.outputId === "string" ? params.outputId : "";
  const [deleteOpen, setDeleteOpen] = useState(false);
  const originTaskId =
    searchParams.get("origin") === "task" && searchParams.get("taskId")
      ? searchParams.get("taskId")
      : null;

  const backHref = useMemo(() => {
    const nextParams = new URLSearchParams(searchParams?.toString() ?? "");
    const tab = searchParams.get("tab");
    if (tab === "overview" || tab === "work" || tab === "exercises") {
      nextParams.set("tab", tab);
    } else if (!nextParams.get("tab")) {
      nextParams.set("tab", "work");
    }
    if (!nextParams.get("resourcePage")) {
      nextParams.set(
        "resourcePage",
        String(normalizePositiveInt(searchParams.get("resourcePage"))),
      );
    }
    if (!nextParams.get("taskPage")) {
      nextParams.set(
        "taskPage",
        String(normalizePositiveInt(searchParams.get("taskPage"))),
      );
    }
    if (!nextParams.get("workPage")) {
      nextParams.set(
        "workPage",
        String(normalizePositiveInt(searchParams.get("workPage"))),
      );
    }
    if (originTaskId) {
      return `/admin/lesson-plans/tasks/${encodeURIComponent(originTaskId)}?${nextParams.toString()}`;
    }
    return `/admin/lesson-plans?${nextParams.toString()}`;
  }, [originTaskId, searchParams]);

  const backLabel = originTaskId ? "Quay lại công việc" : "Quay lại Giáo Án";

  const {
    data: output,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<LessonOutputItem>({
    queryKey: ["lesson", "output", outputId],
    queryFn: () => lessonApi.getLessonOutputById(outputId),
    enabled: !!outputId,
  });

  const updateOutputMutation = useMutation({
    mutationFn: (payload: CreateLessonOutputPayload) =>
      lessonApi.updateLessonOutput(outputId, payload),
    onSuccess: async (updatedOutput) => {
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: ["lesson", "output", outputId] }),
        queryClient.invalidateQueries({ queryKey: ["lesson", "work"] }),
        queryClient.invalidateQueries({ queryKey: ["lesson", "exercises"] }),
      ];
      if (updatedOutput.lessonTaskId) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: ["lesson", "task", updatedOutput.lessonTaskId],
          }),
        );
      }
      await Promise.all(invalidations);
      toast.success("Đã cập nhật sản phẩm bài học.");
    },
    onError: (mutationError) => {
      toast.error(
        getErrorMessage(mutationError, "Không thể cập nhật sản phẩm bài học."),
      );
    },
  });

  const deleteOutputMutation = useMutation({
    mutationFn: () => lessonApi.deleteLessonOutput(outputId),
    onSuccess: async () => {
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: ["lesson", "work"] }),
        queryClient.invalidateQueries({ queryKey: ["lesson", "exercises"] }),
        queryClient.invalidateQueries({ queryKey: ["lesson"] }),
      ];
      if (output?.lessonTaskId) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: ["lesson", "task", output.lessonTaskId],
          }),
        );
      }
      await Promise.all(invalidations);
      toast.success("Đã xóa sản phẩm bài học.");
      router.push(backHref);
    },
    onError: (mutationError) => {
      toast.error(getErrorMessage(mutationError, "Không thể xóa sản phẩm bài học."));
    },
  });

  if (!outputId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
        <div className="mx-auto w-full max-w-5xl rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm">
          <p className="text-base font-semibold text-text-primary">
            Không tìm thấy sản phẩm bài học.
          </p>
          <Link
            href={backHref}
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            {backLabel}
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
            {backLabel}
          </Link>
        </div>

        {isLoading ? (
          <>
            <section className="h-56 animate-pulse rounded-[2rem] border border-border-default bg-bg-surface" />
            <div className="grid gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`output-meta-skeleton-${index}`}
                  className="h-28 animate-pulse rounded-[1.35rem] border border-border-default bg-bg-surface"
                />
              ))}
            </div>
          </>
        ) : isError || !output ? (
          <section className="rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
            <div className="rounded-[1.5rem] border border-dashed border-border-default bg-bg-secondary/40 px-5 py-12 text-center">
              <p className="text-base font-semibold text-text-primary">
                Không tải được sản phẩm bài học.
              </p>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                {getErrorMessage(error, "Đã có lỗi khi tải dữ liệu.")}
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
                  {backLabel}
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="relative overflow-hidden rounded-[2rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_34%)]"
                aria-hidden
              />

              <div className="relative flex flex-col gap-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
                      Chi tiết sản phẩm bài học
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary text-balance sm:text-4xl">
                      {output.lessonName || "Chưa đặt tên sản phẩm"}
                    </h1>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonOutputStatusChipClass(
                          output.status,
                        )}`}
                      >
                        {LESSON_OUTPUT_STATUS_LABELS[output.status]}
                      </span>
                      {output.task ? (
                        <span className="rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
                          Task cha: {output.task.title ?? output.task.id}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-text-secondary">
                      {output.originalTitle?.trim() ||
                        "Chưa có tiêu đề gốc — có thể bổ sung ở form bên dưới."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteOpen(true)}
                      className="inline-flex min-h-11 items-center rounded-xl border border-error/30 bg-error/8 px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      Xóa sản phẩm
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <OutputMetaCard
                    label="Cuộc thi / đề"
                    value={output.contestUploaded ?? "Chưa ghi"}
                    hint="Mã contest hoặc bộ đề đã gắn."
                  />
                  <OutputMetaCard
                    label="Ngày"
                    value={formatLessonDateOnly(output.date)}
                    hint="Mốc ngày hệ thống dùng để sắp xếp output."
                  />
                  <OutputMetaCard
                    label="Chi phí"
                    value={`${output.cost.toLocaleString("vi-VN")} đ`}
                    hint="Giá trị cost đang lưu trên record output."
                  />
                  <OutputMetaCard
                    label="Cập nhật"
                    value={formatLessonDateTime(output.updatedAt)}
                    hint="Thời điểm thay đổi gần nhất của output."
                  />
                </div>
              </div>
            </section>

            <div className="grid gap-6 flex flex-col">
              <section className="rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                    Bối cảnh
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-text-primary">
                    Thông tin điều phối
                  </h2>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="rounded-[1.35rem] border border-border-default bg-bg-secondary/40 p-4">
                    <p className="text-sm font-semibold text-text-primary">
                      Task cha
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      {output.task?.title ?? "Chưa có task liên kết"}
                    </p>
                    {output.task ? (
                      <p className="mt-1 text-xs text-text-muted">
                        Task ID: {output.task.id}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-[1.35rem] border border-border-default bg-bg-secondary/40 p-4">
                    <p className="text-sm font-semibold text-text-primary">
                      Nhân sự phụ trách
                    </p>
                    {output.staff ? (
                      <>
                        <p className="mt-2 text-sm font-medium text-text-primary">
                          {output.staff.fullName}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {formatLessonStaffRoleLabel(output.staff.roles)}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-text-muted">
                        Chưa gán nhân sự cho output này.
                      </p>
                    )}
                  </div>

                  <div className="rounded-[1.35rem] border border-border-default bg-bg-secondary/40 p-4">
                    <p className="text-sm font-semibold text-text-primary">
                      Liên kết
                    </p>
                    <div className="mt-3 space-y-2">
                      {output.originalLink ? (
                        <a
                          href={output.originalLink}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-sm text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          Link gốc: {output.originalLink}
                        </a>
                      ) : null}
                      {output.link ? (
                        <a
                          href={output.link}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-sm text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          Link output: {output.link}
                        </a>
                      ) : null}
                      {!output.originalLink && !output.link ? (
                        <p className="text-sm text-text-muted">
                          Chưa có link nào được gắn cho output này.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                    Chỉnh sửa
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-text-primary">
                    Form sản phẩm bài học
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    Cập nhật đầy đủ thông tin sản phẩm tại đây (thay cho chỉnh sửa
                    nhanh trên danh sách tab Công việc).
                  </p>
                </div>

                <div className="mt-5">
                  <LessonOutputEditorForm
                    mode="edit"
                    initialData={output}
                    allowTasklessOutput={!output.lessonTaskId}
                    isSubmitting={updateOutputMutation.isPending}
                    submitLabel="Lưu sản phẩm"
                    onSubmit={async (payload) => {
                      await updateOutputMutation.mutateAsync(payload);
                    }}
                  />
                </div>
              </section>
            </div>
          </>
        )}
      </div>

      <LessonDeleteConfirmPopup
        open={deleteOpen}
        title="Xóa sản phẩm bài học?"
        description={`Thao tác này sẽ xóa “${output?.lessonName ?? "chưa đặt tên"}”. Dữ liệu sẽ biến mất khỏi công việc liên quan và tab Công việc.`}
        confirmLabel="Xóa"
        onClose={() => {
          if (deleteOutputMutation.isPending) return;
          setDeleteOpen(false);
        }}
        onConfirm={async () => {
          await deleteOutputMutation.mutateAsync();
        }}
        isSubmitting={deleteOutputMutation.isPending}
      />
    </div>
  );
}
