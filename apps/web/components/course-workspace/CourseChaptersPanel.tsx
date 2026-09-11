"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as classApi from "@/lib/apis/class.api";
import { courseKeys } from "@/lib/query-keys";
import { invalidateCoursePracticeTopicQueries } from "@/lib/query-invalidation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveActionFooter,
  ResponsiveDialog,
  ResponsiveDialogBody,
} from "@/components/ui/ResponsiveDialog";
import {
  confirmOrderDirtyLeave,
  useConfirmDialog,
} from "@/components/ui/ConfirmDialog";
import type { Chapter } from "@/dtos/topic.dto";
import { RowActionsMenu } from "@/components/course-workspace/RowActionsMenu";
import {
  OrderSaveBar,
  SortableOrderList,
  SortableRow,
  useOrderDraft,
} from "@/components/course-workspace/SortableOrderList";

export function CourseChaptersPanel({
  courseId,
  canEdit,
  onOpenChapter,
  onOrderDirtyChange,
}: {
  courseId: string;
  canEdit: boolean;
  onOpenChapter: (chapterId: string) => void;
  onOrderDirtyChange?: (dirty: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirmDialog();
  const [newTitle, setNewTitle] = useState("");
  const [renameTarget, setRenameTarget] = useState<Chapter | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  const { data: chapters = [], isLoading } = useQuery({
    queryKey: courseKeys.chapters(courseId),
    queryFn: () => classApi.getChapters(courseId),
    enabled: Boolean(courseId),
  });

  const { items, orderDirty, applyDrag, discard } = useOrderDraft(
    chapters,
    courseId,
  );

  useEffect(() => {
    onOrderDirtyChange?.(orderDirty);
    return () => onOrderDirtyChange?.(false);
  }, [orderDirty, onOrderDirtyChange]);

  const invalidate = () => invalidateCoursePracticeTopicQueries(queryClient, courseId);

  const createMutation = useMutation({
    mutationFn: (title: string) => classApi.createChapter(courseId, { title }),
    onSuccess: () => {
      toast.success("Đã thêm chủ đề.");
      setNewTitle("");
      discard();
      void invalidate();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || "Không thể thêm chủ đề.");
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      classApi.updateChapter(courseId, id, { title }),
    onSuccess: () => {
      toast.success("Đã đổi tên chủ đề.");
      setRenameTarget(null);
      void invalidate();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || "Không thể cập nhật chủ đề.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => classApi.deleteChapter(courseId, id),
    onSuccess: () => {
      toast.success("Đã xoá chủ đề.");
      discard();
      void invalidate();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || "Không thể xoá chủ đề.");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (chapterIds: string[]) =>
      classApi.reorderChapters(courseId, chapterIds),
    onSuccess: () => {
      toast.success("Đã lưu thứ tự chủ đề.");
      discard();
      void invalidate();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || "Không thể sắp xếp chủ đề.");
    },
  });

  const addChapter = () => {
    const title = newTitle.trim();
    if (!title || createMutation.isPending) return;
    createMutation.mutate(title);
  };

  const openChapter = async (chapterId: string) => {
    if (!(await confirmOrderDirtyLeave(confirm, orderDirty))) return;
    discard();
    onOpenChapter(chapterId);
  };

  const requestDelete = async (chapter: Chapter) => {
    const ok = await confirm({
      title: "Xoá chủ đề?",
      description: `Xoá chủ đề "${chapter.title}" và mọi chuyên đề bên trong? Không xoá được nếu lớp đang dùng nội dung này.`,
      confirmLabel: "Xoá",
      variant: "destructive",
    });
    if (!ok) return;
    deleteMutation.mutate(chapter.id);
  };

  const canReorder = canEdit && items.length > 1;

  if (isLoading) {
    return (
      <section className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-2 h-4 w-full max-w-md" />
        <div className="mt-4 space-y-2" role="status" aria-label="Đang tải chủ đề">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:p-5">
      <h2 className="text-base font-semibold text-text-primary">Chủ đề</h2>
      <p className="mt-0.5 text-sm text-text-secondary">
        Mỗi chủ đề chứa các chuyên đề lý thuyết và luyện tập. Bấm một dòng để mở danh sách chuyên đề.
      </p>

      {canEdit ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addChapter();
              }
            }}
            aria-label="Tên chủ đề mới"
            placeholder="Tên chủ đề mới..."
            className="min-h-11 min-w-0 flex-1 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:min-h-10"
          />
          <button
            type="button"
            onClick={addChapter}
            disabled={!newTitle.trim() || createMutation.isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-primary-hover disabled:opacity-60 sm:min-h-10"
          >
            Thêm chủ đề
          </button>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border-default p-4 text-sm text-text-secondary">
          Chưa có chủ đề nào. Thêm chủ đề đầu tiên để bắt đầu soạn nội dung.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <SortableOrderList items={items} canReorder={canReorder} onReorder={applyDrag}>
            {(chapter) => (
              <SortableRow
                id={chapter.id}
                canReorder={canReorder}
                rowLabel={`Mở chuyên đề của ${chapter.title}`}
                onRowClick={() => void openChapter(chapter.id)}
                menu={
                  canEdit ? (
                    <RowActionsMenu
                      label={`Thao tác chủ đề ${chapter.title}`}
                      actions={[
                        {
                          label: "Đổi tên",
                          onSelect: () => {
                            setRenameTarget(chapter);
                            setRenameTitle(chapter.title);
                          },
                        },
                        {
                          label: "Xoá",
                          variant: "danger",
                          onSelect: () => void requestDelete(chapter),
                        },
                      ]}
                    />
                  ) : null
                }
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {chapter.title}
                  </p>
                  <p className="text-xs text-text-muted">
                    {chapter.topicCount ?? 0} chuyên đề
                  </p>
                </div>
                <svg
                  className="size-4 shrink-0 text-text-muted"
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
              </SortableRow>
            )}
          </SortableOrderList>
          {canEdit ? (
            <OrderSaveBar
              dirty={orderDirty}
              saving={reorderMutation.isPending}
              onSave={() => {
                if (!orderDirty || reorderMutation.isPending) return;
                reorderMutation.mutate(items.map((row) => row.id));
              }}
              onDiscard={discard}
            />
          ) : null}
        </div>
      )}

      {renameTarget ? (
        <ResponsiveDialog
          labelledBy="rename-chapter-title"
          onBackdropClick={() => setRenameTarget(null)}
          size="sm"
        >
          <div className="border-b border-border-default px-4 py-3">
            <h3 id="rename-chapter-title" className="text-base font-semibold text-text-primary">
              Đổi tên chủ đề
            </h3>
          </div>
          <ResponsiveDialogBody>
            <input
              autoFocus
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const title = renameTitle.trim();
                  if (title) renameMutation.mutate({ id: renameTarget.id, title });
                }
              }}
              className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            />
          </ResponsiveDialogBody>
          <ResponsiveActionFooter>
            <button
              type="button"
              onClick={() => setRenameTarget(null)}
              className="rounded-md border border-border-default px-3 py-2 text-sm font-medium text-text-secondary"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={() => {
                const title = renameTitle.trim();
                if (title) renameMutation.mutate({ id: renameTarget.id, title });
              }}
              disabled={!renameTitle.trim() || renameMutation.isPending}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-text-inverse disabled:opacity-60"
            >
              Lưu
            </button>
          </ResponsiveActionFooter>
        </ResponsiveDialog>
      ) : null}
      {dialog}
    </section>
  );
}
