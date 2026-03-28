"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CreateLessonOutputPayload } from "@/dtos/lesson.dto";
import * as lessonApi from "@/lib/apis/lesson.api";
import LessonDeleteConfirmPopup from "./LessonDeleteConfirmPopup";
import LessonOutputEditorForm from "./LessonOutputEditorForm";

type Props = {
  open: boolean;
  outputId: string | null;
  onClose: () => void;
  hideStaffFields?: boolean;
  showParentTaskBanner?: boolean;
  allowTasklessOutput?: boolean;
  forceSharedLayout?: boolean;
  allowDelete?: boolean;
  relatedTaskIds?: string[];
};

function getErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ??
    (error as Error)?.message ??
    fallback
  );
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function LessonOutputQuickPopup({
  open,
  outputId,
  onClose,
  hideStaffFields = true,
  showParentTaskBanner = false,
  allowTasklessOutput = true,
  forceSharedLayout = false,
  allowDelete = false,
  relatedTaskIds = [],
}: Props) {
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    data: outputDetail,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["lesson", "output", outputId],
    queryFn: () => lessonApi.getLessonOutputById(outputId as string),
    enabled: open && Boolean(outputId),
  });

  const invalidateRelatedQueries = async (currentTaskId?: string | null) => {
    const taskIds = Array.from(
      new Set(
        [currentTaskId, ...relatedTaskIds].filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        ),
      ),
    );

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["lesson", "output", outputId] }),
      queryClient.invalidateQueries({ queryKey: ["lesson", "work"] }),
      queryClient.invalidateQueries({ queryKey: ["lesson", "exercises"] }),
      queryClient.invalidateQueries({ queryKey: ["lesson", "overview"] }),
      ...taskIds.map((taskId) =>
        queryClient.invalidateQueries({
          queryKey: ["lesson", "task", taskId],
        }),
      ),
    ]);
  };

  const updateMutation = useMutation({
    mutationFn: (payload: CreateLessonOutputPayload) =>
      lessonApi.updateLessonOutput(outputId as string, payload),
    onSuccess: async () => {
      toast.success("Đã cập nhật thông tin bài.");
      await invalidateRelatedQueries(outputDetail?.lessonTaskId);
      onClose();
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không cập nhật được thông tin bài."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => lessonApi.deleteLessonOutput(outputId as string),
    onSuccess: async () => {
      toast.success("Đã xóa sản phẩm bài học.");
      await invalidateRelatedQueries(outputDetail?.lessonTaskId);
      setDeleteOpen(false);
      onClose();
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không xóa được sản phẩm bài học."));
    },
  });

  const handleClose = () => {
    if (updateMutation.isPending || deleteMutation.isPending) {
      return;
    }
    onClose();
  };

  if (!open || !outputId) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" aria-hidden onClick={handleClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-output-quick-popup-title"
        className="fixed inset-x-3 top-1/2 z-50 max-h-[90vh] -translate-y-1/2 overflow-y-auto overscroll-contain rounded-[1.5rem] border border-border-default bg-bg-surface p-4 shadow-xl sm:left-1/2 sm:w-full sm:max-w-5xl sm:-translate-x-1/2 sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-border-default pb-3 sm:mb-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              Bài giáo án
            </p>
            <h3
              id="lesson-output-quick-popup-title"
              className="mt-1 text-lg font-semibold text-text-primary"
            >
              Chỉnh sửa thông tin bài
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {allowDelete ? (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                disabled={updateMutation.isPending || deleteMutation.isPending}
                className="inline-flex min-h-10 items-center rounded-xl border border-error/25 bg-error/8 px-3 py-2 text-sm font-medium text-error transition-colors hover:bg-error/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
              >
                Xóa bài
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleClose}
              disabled={updateMutation.isPending || deleteMutation.isPending}
              className="rounded-xl p-2 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
              aria-label="Đóng popup chỉnh sửa bài"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {isFetching && !outputDetail ? (
          <div className="rounded-xl border border-border-default bg-bg-secondary/35 px-4 py-8 text-center text-sm text-text-secondary">
            Đang tải dữ liệu bài...
          </div>
        ) : null}

        {isError ? (
          <div className="rounded-xl border border-error/40 bg-error/10 px-4 py-8 text-center text-sm text-error">
            {getErrorMessage(error, "Không tải được dữ liệu bài.")}
          </div>
        ) : null}

        {outputDetail ? (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border-default bg-bg-secondary/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Ngày tạo</p>
                <p className="mt-1 text-sm text-text-primary">{formatDateTime(outputDetail.createdAt)}</p>
              </div>
              <div className="rounded-xl border border-border-default bg-bg-secondary/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Nhân sự hiện tại</p>
                <p className="mt-1 text-sm text-text-primary">
                  {outputDetail.staff?.fullName?.trim() || "Chưa có dữ liệu"}
                </p>
              </div>
            </div>
            <LessonOutputEditorForm
              mode="edit"
              initialData={outputDetail}
              showParentTaskBanner={showParentTaskBanner}
              hideStaffFields={hideStaffFields}
              forceSharedLayout={forceSharedLayout}
              allowTasklessOutput={allowTasklessOutput}
              isSubmitting={updateMutation.isPending}
              submitLabel="Lưu thay đổi"
              onCancel={handleClose}
              onSubmit={async (payload) => {
                await updateMutation.mutateAsync(payload);
              }}
            />
          </>
        ) : null}
      </div>

      <LessonDeleteConfirmPopup
        open={deleteOpen}
        title="Xóa sản phẩm bài học?"
        description={`Thao tác này sẽ xóa “${outputDetail?.lessonName ?? "chưa đặt tên"}” khỏi danh sách giáo án hiện tại.`}
        confirmLabel="Xóa"
        onClose={() => {
          if (deleteMutation.isPending) {
            return;
          }
          setDeleteOpen(false);
        }}
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
        isSubmitting={deleteMutation.isPending}
      />
    </>
  );
}
