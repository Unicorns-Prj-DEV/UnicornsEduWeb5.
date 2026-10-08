"use client";

import { Fragment, useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Plus } from "lucide-react";
import { practiceLessonQuestionKeys } from "@/lib/query-keys";
import * as classApi from "@/lib/apis/class.api";
import { useAppConfig } from "@/lib/hooks/useAppConfig";
import {
  buildExamLayout,
  itExamBreakdown,
  orderExamQuestions,
} from "@/lib/exam-layout";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ElectiveGroupSettings } from "@/components/admin/ElectiveGroupSettings";
import { AddPracticeQuestionDialog } from "@/components/admin/practice-lesson/AddPracticeQuestionDialog";
import { ExamStructureSummary } from "@/components/admin/practice-lesson/ExamStructureSummary";
import { PracticeQuestionLinkItem } from "@/components/admin/practice-lesson/PracticeQuestionLinkItem";
import type {
  QuestionLink,
  UpdateCourseLessonPayload,
} from "@/dtos/course-content.dto";

type ViewMode = "full" | "compact";

const PART_TITLES: Record<string, string> = {
  "PHẦN I": "Phần I · Trắc nghiệm nhiều phương án",
  "PHẦN II": "Phần II · Trắc nghiệm Đúng/Sai",
};

// ─────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────

function usePracticeLessonQuestions(lessonId: string) {
  const queryClient = useQueryClient();

  const { data: links = [], isLoading } = useQuery({
    queryKey: practiceLessonQuestionKeys.list(lessonId),
    queryFn: () => classApi.getPracticeLessonQuestions(lessonId),
    enabled: Boolean(lessonId),
  });

  const { data: summary } = useQuery({
    queryKey: practiceLessonQuestionKeys.summary(lessonId),
    queryFn: () => classApi.getPracticeLessonQuestionSummary(lessonId),
    enabled: Boolean(lessonId),
  });

  const { data: assigned } = useQuery({
    queryKey: practiceLessonQuestionKeys.isAssigned(lessonId),
    queryFn: () => classApi.isPracticeLessonAssigned(lessonId),
    enabled: Boolean(lessonId),
  });

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: practiceLessonQuestionKeys.list(lessonId),
      }),
      queryClient.invalidateQueries({
        queryKey: practiceLessonQuestionKeys.summary(lessonId),
      }),
      queryClient.invalidateQueries({
        queryKey: practiceLessonQuestionKeys.isAssigned(lessonId),
      }),
    ]);
  }, [queryClient, lessonId]);

  return { links, summary, assigned: assigned ?? false, isLoading, invalidate };
}

/** Đổi thứ tự câu, cập nhật cache trước (optimistic) rồi lưu cả danh sách. */
function useReorderQuestions(lessonId: string) {
  const queryClient = useQueryClient();
  const listKey = practiceLessonQuestionKeys.list(lessonId);

  return useMutation({
    mutationFn: (ordered: QuestionLink[]) =>
      classApi.reorderPracticeLessonQuestions(
        lessonId,
        ordered.map((l) => l.id),
      ),
    onMutate: async (ordered) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<QuestionLink[]>(listKey);
      queryClient.setQueryData<QuestionLink[]>(
        listKey,
        ordered.map((link, order) => ({ ...link, order })),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
      toast.error("Không thể đổi thứ tự câu.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border-default pb-1.5 pt-2">
      <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
      <span className="shrink-0 text-xs text-text-muted">{count} câu</span>
    </div>
  );
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Chế độ xem câu hỏi"
      className="inline-flex rounded-md border border-border-default bg-bg-primary p-0.5"
    >
      {(
        [
          ["full", "Đầy đủ"],
          ["compact", "Gọn"],
        ] as const
      ).map(([mode, label]) => (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={value === mode}
          onClick={() => onChange(mode)}
          className={cn(
            "min-h-8 rounded px-3 text-xs font-medium transition-colors",
            value === mode
              ? "bg-bg-surface text-text-primary shadow-xs"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function PracticeLessonQuestionsCard({
  lessonId,
  courseId,
  canEdit,
  electiveGroupNames,
  onUpdateLesson,
}: {
  lessonId: string;
  courseId: string;
  canEdit: boolean;
  /** Tên hai nhóm tự chọn (chỉ hồ sơ có nhóm tự chọn — IT). */
  electiveGroupNames?: { elective1Name?: string | null; elective2Name?: string | null };
  /** Lưu tên nhóm tự chọn vào tiết thực hành. Thiếu → ẩn ô tên nhóm. */
  onUpdateLesson?: (
    patch: Pick<UpdateCourseLessonPayload, "elective1Name" | "elective2Name">,
  ) => void;
}) {
  const { links, summary, assigned, isLoading, invalidate } =
    usePracticeLessonQuestions(lessonId);
  const reorder = useReorderQuestions(lessonId);
  const { data: appConfig } = useAppConfig();
  const hasElectives = appConfig?.electiveGroups ?? false;
  const isAbsolute = appConfig?.scoring === "absolute_it";
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("full");
  const { confirm, dialog } = useConfirmDialog();

  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label="Đang tải danh sách câu hỏi">
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Cùng thứ tự và cách đánh số học sinh thấy trong Bài làm.
  const ordered = orderExamQuestions(
    links.map((link) => ({ ...link, type: link.question.type })),
  );
  const layout = buildExamLayout(
    ordered,
    isAbsolute ? "absolute_it" : "equal_100",
    {
      elective_1: electiveGroupNames?.elective1Name ?? null,
      elective_2: electiveGroupNames?.elective2Name ?? null,
    },
  );
  const breakdown = itExamBreakdown(ordered);
  const showElectives =
    hasElectives && breakdown.elective1 + breakdown.elective2 > 0;
  // Nhóm sắp xếp: chỉ đổi chỗ trong cùng Phần/nhóm, vì vị trí giữa các nhóm do loại câu + slot quyết định.
  const groupOf = (link: QuestionLink) =>
    link.question.type === "true_false_group" ? `II-${link.slot}` : "I";
  const partCounts: Record<string, number> = {
    "PHẦN I": breakdown.part1,
    "PHẦN II":
      breakdown.required2 + breakdown.elective1 + breakdown.elective2,
  };
  const groupCounts: Record<string, number> = {
    elective_1: breakdown.elective1,
    elective_2: breakdown.elective2,
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (assigned) {
      const ok = await confirm({
        title: "Đề đã giao cho lớp",
        description:
          "Đổi thứ tự câu sẽ ảnh hưởng đến lần giao đang chạy. Tiếp tục?",
        confirmLabel: "Tiếp tục",
        variant: "destructive",
      });
      if (!ok) return;
    }
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    const byId = new Map(links.map((link) => [link.id, link]));
    reorder.mutate(next.map((link) => byId.get(link.id)!));
  };

  return (
    <div className="space-y-4">
      {assigned ? (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-text-primary">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
          <span>
            Đề này đã được giao cho lớp. Việc sửa câu hỏi sẽ ảnh hưởng đến các lần giao đang chạy.
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            Câu hỏi trong đề
          </h3>
          <p className="mt-0.5 text-xs text-text-secondary">
            {summary?.totalQuestions ?? links.length} câu hỏi
            {isAbsolute || !summary ? "" : ` · Tổng điểm: ${summary.totalPoints}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {links.length > 0 ? (
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          ) : null}
          {canEdit ? (
            <button
              type="button"
              onClick={() => setShowAddDialog(true)}
              className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-text-inverse hover:bg-primary-hover"
            >
              <Plus className="size-4" aria-hidden />
              Thêm câu hỏi
            </button>
          ) : null}
        </div>
      </div>

      {isAbsolute && links.length > 0 ? (
        <ExamStructureSummary
          breakdown={breakdown}
          formWarning={summary?.formWarning}
          showElectives={showElectives}
        />
      ) : summary?.formWarning ? (
        <p
          role="alert"
          className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-text-primary"
        >
          {summary.formWarning}
        </p>
      ) : null}

      {hasElectives && onUpdateLesson ? (
        <details className="group rounded-lg border border-border-default bg-bg-primary px-3 py-2" open={showElectives}>
          <summary className="cursor-pointer text-xs font-medium text-text-secondary">
            Tên nhóm tự chọn
            <span className="ml-1 font-normal text-text-muted">
              (hiện trên đề học sinh)
            </span>
          </summary>
          <div className="mt-2">
            <ElectiveGroupSettings
              elective1Name={electiveGroupNames?.elective1Name}
              elective2Name={electiveGroupNames?.elective2Name}
              formWarning={null}
              canEdit={canEdit}
              onSave={onUpdateLesson}
            />
          </div>
        </details>
      ) : null}

      {links.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-default p-6 text-center">
          <p className="text-sm text-text-secondary">Chưa có câu hỏi nào trong đề.</p>
          {canEdit ? (
            <button
              type="button"
              onClick={() => setShowAddDialog(true)}
              className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border-default px-3 text-sm font-medium text-text-primary hover:bg-bg-tertiary"
            >
              <Plus className="size-4" aria-hidden />
              Thêm từ ngân hàng
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-2">
          {layout.map((view, index) => {
            const link = view.question;
            const group = groupOf(link);
            return (
              <Fragment key={link.id}>
                {view.partHeader ? (
                  <li className="list-none">
                    <SectionHeader
                      title={PART_TITLES[view.partHeader] ?? view.partHeader}
                      count={partCounts[view.partHeader] ?? 0}
                    />
                  </li>
                ) : null}
                {view.groupHeader ? (
                  <li className="list-none pt-1">
                    <div className="flex items-baseline justify-between gap-2 rounded-md bg-info/10 px-3 py-1.5">
                      <p className="text-xs font-semibold text-info">
                        {view.groupHeader}
                      </p>
                      <span className="shrink-0 text-[11px] text-text-muted">
                        {groupCounts[link.slot] ?? 0} câu
                      </span>
                    </div>
                  </li>
                ) : null}
                <PracticeQuestionLinkItem
                  link={link}
                  label={`Câu ${view.number}`}
                  lessonId={lessonId}
                  courseId={courseId}
                  canEdit={canEdit}
                  assigned={assigned}
                  hasElectives={hasElectives}
                  isAbsolute={isAbsolute}
                  compact={viewMode === "compact"}
                  canMoveUp={
                    !reorder.isPending &&
                    index > 0 &&
                    groupOf(ordered[index - 1]) === group
                  }
                  canMoveDown={
                    !reorder.isPending &&
                    index < ordered.length - 1 &&
                    groupOf(ordered[index + 1]) === group
                  }
                  onMove={(direction) => void move(index, direction)}
                  confirm={confirm}
                  onSaved={invalidate}
                />
              </Fragment>
            );
          })}
        </ul>
      )}

      {showAddDialog ? (
        <AddPracticeQuestionDialog
          lessonId={lessonId}
          courseId={courseId}
          existingLinkQuestionIds={links.map((l) => l.questionId)}
          assigned={assigned}
          onClose={() => setShowAddDialog(false)}
          onAdded={invalidate}
        />
      ) : null}
      {dialog}
    </div>
  );
}
