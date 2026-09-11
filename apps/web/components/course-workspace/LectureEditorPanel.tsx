"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as classApi from "@/lib/apis/class.api";
import * as questionApi from "@/lib/apis/question.api";
import { courseKeys, questionKeys } from "@/lib/query-keys";
import { runBackgroundSave } from "@/lib/mutation-feedback";
import MathRichTextEditor from "@/components/ui/MathRichTextEditor";
import MathContent from "@/components/ui/MathContent";
import {
  confirmUnsavedClose,
  useConfirmDialog,
} from "@/components/ui/ConfirmDialog";
import type { Lecture } from "@/dtos/topic.dto";
import {
  CONTENT_LIMITS,
  isHttpUrl,
  overLimitMessage,
} from "@/dtos/content-limits";
import { cn } from "@/lib/utils";

function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

export function LectureEditorPanel({
  topicId,
  courseId,
  lecture,
  isNew,
  canEdit,
  onBack,
  onCreated,
  onDeleted,
  className,
}: {
  topicId: string;
  courseId: string;
  lecture: Lecture | null;
  isNew: boolean;
  canEdit: boolean;
  onBack: () => void;
  onCreated: (lectureId: string) => void;
  onDeleted?: () => void;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirmDialog();
  const [title, setTitle] = useState(lecture?.title ?? "");
  const [videoUrl, setVideoUrl] = useState(lecture?.videoUrl ?? "");
  const [content, setContent] = useState(lecture?.content ?? "");
  const [quizIds, setQuizIds] = useState<string[]>([]);
  const fieldId = useId();
  // Set: ngân hàng câu hỏi dài, tra cứu O(1) khi render từng câu.
  const selectedQuizIdSet = useMemo(() => new Set(quizIds), [quizIds]);
  const [quizSeeded, setQuizSeeded] = useState(isNew);

  const { data: courseQuestions = [] } = useQuery({
    queryKey: questionKeys.list({ courseId, take: 200 }),
    queryFn: () => questionApi.getQuestions({ courseId }, 0, 200),
    enabled: Boolean(courseId) && canEdit,
  });

  const { data: linkedQuizzes = [], isSuccess: linkedReady } = useQuery({
    queryKey: courseKeys.lectureQuizzes(lecture?.id ?? ""),
    queryFn: () => classApi.getLectureQuizzes(topicId, lecture!.id),
    enabled: Boolean(lecture?.id) && !isNew,
  });

  useEffect(() => {
    if (!isNew && linkedReady && !quizSeeded) {
      setQuizSeeded(true);
      setQuizIds(linkedQuizzes.map((q) => q.questionId));
    }
  }, [isNew, linkedReady, quizSeeded, linkedQuizzes]);

  const originalQuizIds = linkedQuizzes.map((q) => q.questionId);
  const isDirty =
    title !== (lecture?.title ?? "") ||
    videoUrl !== (lecture?.videoUrl ?? "") ||
    content !== (lecture?.content ?? "") ||
    (quizSeeded && !sameIdSet(quizIds, isNew ? [] : originalQuizIds));

  const requestBack = async () => {
    if (await confirmUnsavedClose(confirm, isDirty)) onBack();
  };

  const persist = async () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      toast.error("Nhập tên bài học.");
      return;
    }
    const nextVideo = videoUrl.trim() || null;
    const nextContent = content.trim() || null;
    if (nextVideo) {
      if (nextVideo.length > CONTENT_LIMITS.url) {
        toast.error(overLimitMessage("Link video", CONTENT_LIMITS.url));
        return;
      }
      if (!isHttpUrl(nextVideo)) {
        toast.error("Link video phải là URL hợp lệ (http/https).");
        return;
      }
    }
    if (nextContent && nextContent.length > CONTENT_LIMITS.lectureContent) {
      toast.error(overLimitMessage("Nội dung bài học", CONTENT_LIMITS.lectureContent));
      return;
    }

    const currentQuizIds = isNew ? [] : originalQuizIds;
    // Set: diff hai danh sách id, tra cứu O(1) thay vì O(n*m).
    const currentQuizIdSet = new Set(currentQuizIds);
    const nextQuizIdSet = new Set(quizIds);
    const toAdd = quizIds.filter((id) => !currentQuizIdSet.has(id));
    const toRemove = currentQuizIds.filter((id) => !nextQuizIdSet.has(id));
    if (toRemove.length > 0) {
      const ok = await confirm({
        title: "Gỡ bài tập khỏi bài học?",
        description: `Sẽ gỡ ${toRemove.length} bài tập khỏi bài học này. Tiếp tục?`,
        confirmLabel: "Tiếp tục",
        variant: "destructive",
      });
      if (!ok) return;
    }

    runBackgroundSave({
      loadingMessage: isNew ? "Đang tạo bài học..." : "Đang lưu bài học...",
      successMessage: isNew ? "Đã tạo bài học." : "Đã lưu bài học.",
      errorMessage: "Không thể lưu bài học.",
      action: async () => {
        const saved = isNew
          ? await classApi.createLecture(topicId, {
              title: nextTitle,
              videoUrl: nextVideo,
              content: nextContent,
            })
          : await classApi.updateLecture(topicId, lecture!.id, {
              title: nextTitle,
              videoUrl: nextVideo,
              content: nextContent,
            });
        const lectureId = saved.id;
        if (toAdd.length) {
          await classApi.linkQuizQuestions(topicId, lectureId, toAdd);
        }
        for (const qid of toRemove) {
          await classApi.unlinkQuizQuestion(topicId, lectureId, qid);
        }
        return saved;
      },
      onSuccess: async (saved) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: courseKeys.lectures(topicId) }),
          saved
            ? queryClient.invalidateQueries({
                queryKey: courseKeys.lectureQuizzes(saved.id),
              })
            : Promise.resolve(),
        ]);
        if (isNew && saved) onCreated(saved.id);
      },
    });
  };

  const requestDelete = async () => {
    if (!lecture) return;
    const ok = await confirm({
      title: "Xoá bài học?",
      description: `Xoá bài học "${lecture.title}"?`,
      confirmLabel: "Xoá",
      variant: "destructive",
    });
    if (!ok) return;
    runBackgroundSave({
      loadingMessage: "Đang xoá bài học...",
      successMessage: "Đã xoá bài học.",
      errorMessage: "Không thể xoá bài học.",
      action: () => classApi.deleteLecture(topicId, lecture.id),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: courseKeys.lectures(topicId) });
        onDeleted?.();
      },
    });
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", className)}>
      <button
        type="button"
        onClick={() => void requestBack()}
        className="inline-flex shrink-0 items-center gap-1 self-start text-sm text-text-secondary hover:text-text-primary"
      >
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Bài học
      </button>

      <div className="shrink-0">
        <label
          htmlFor={`${fieldId}-title`}
          className="mb-1 block text-xs font-medium text-text-muted"
        >
          Tiêu đề
        </label>
        <input
          id={`${fieldId}-title`}
          autoFocus
          value={title}
          disabled={!canEdit}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
        />
      </div>

      <div className="shrink-0">
        <label
          htmlFor={`${fieldId}-video-url`}
          className="mb-1 block text-xs font-medium text-text-muted"
        >
          Link video YouTube (tuỳ chọn)
        </label>
        <input
          id={`${fieldId}-video-url`}
          value={videoUrl}
          disabled={!canEdit}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <span className="mb-1 block shrink-0 text-xs font-medium text-text-muted">
          Nội dung lý thuyết (hỗ trợ LaTeX: $x^2$)
        </span>
        {canEdit ? (
          <MathRichTextEditor
            value={content}
            onChange={setContent}
            ariaLabel="Nội dung lý thuyết"
            placeholder="Nhập nội dung bài học..."
            minHeight="min-h-[160px]"
            fill
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border-default p-3 text-sm">
            <MathContent content={content || "—"} />
          </div>
        )}
      </div>

      <div className="shrink-0">
        <span className="mb-1 block text-xs font-medium text-text-muted">
          Bài tập ôn nhẹ ({quizIds.length} câu đã chọn)
        </span>
        <p className="mb-2 text-xs text-text-muted">
          Chọn câu hỏi từ ngân hàng câu hỏi của khoá học. Không sinh bài làm, không tính điểm.
        </p>
        {courseQuestions.length === 0 ? (
          <p className="text-xs italic text-text-muted">
            Chưa có câu hỏi nào trong ngân hàng.
          </p>
        ) : (
          <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-md border border-border-default p-2">
            {courseQuestions.map((q) => {
              const isSelected = selectedQuizIdSet.has(q.id);
              return (
                <label
                  key={q.id}
                  className={`flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                    isSelected ? "bg-primary/5" : "hover:bg-bg-secondary/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={!canEdit}
                    onChange={() => {
                      setQuizIds((prev) =>
                        isSelected ? prev.filter((id) => id !== q.id) : [...prev, q.id],
                      );
                    }}
                    className="mt-0.5 accent-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <MathContent content={q.content.slice(0, 100)} className="text-xs" />
                    <span className="ml-1 text-text-muted">
                      ({q.type === "single_choice" ? "Trắc nghiệm" : "Tự luận"})
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {canEdit ? (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:justify-between">
          {!isNew ? (
            <button
              type="button"
              onClick={() => void requestDelete()}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-error/30 px-4 py-2 text-sm font-medium text-error hover:bg-error/10 sm:min-h-10"
            >
              Xoá bài học
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => void persist()}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-primary-hover sm:min-h-10"
          >
            Lưu bài học
          </button>
        </div>
      ) : null}
      {dialog}
    </div>
  );
}
