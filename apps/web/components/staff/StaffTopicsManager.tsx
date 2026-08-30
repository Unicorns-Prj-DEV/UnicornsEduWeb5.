"use client";

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Video,
  FileText,
  X,
} from "lucide-react";
import { api } from "@/lib/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import RichTextEditor from "@/components/ui/RichTextEditor";
import YouTubeEmbed from "@/components/ui/YouTubeEmbed";
import MathContent from "@/components/ui/MathContent";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
} from "@/components/ui/ResponsiveDialog";
import { cn } from "@/lib/utils";

interface Topic {
  id: string;
  classId: string;
  title: string;
  videoUrl: string | null;
  content: string | null;
  order: number;
  createdAt: string;
}

interface TopicsPage {
  data: Topic[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_SIZE = 20;

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function SortableTopicRow({
  topic,
  onEdit,
  onDelete,
}: {
  topic: Topic;
  onEdit: (t: Topic) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const hasVideo = Boolean(topic.videoUrl);
  const hasContent = Boolean(topic.content);

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="transition-colors hover:border-border-focus/50">
        <div className="flex items-center gap-3 p-3.5 sm:p-4">
          <button
            type="button"
            className="cursor-grab touch-none text-text-muted hover:text-text-primary p-1 -m-1"
            title="Kéo thả để đổi thứ tự"
            aria-label="Kéo thả để đổi thứ tự"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-text-primary text-sm sm:text-base truncate">
                {topic.title}
              </h3>
              {hasVideo && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  <Video className="size-3" />
                  Video
                </span>
              )}
              {hasContent && (
                <span className="inline-flex items-center gap-1 rounded-full bg-bg-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                  <FileText className="size-3" />
                  Bài đọc
                </span>
              )}
            </div>
            <div className="text-xs text-text-muted mt-1">
              Đăng ngày: {formatDate(topic.createdAt)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onEdit(topic)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs sm:text-sm font-medium text-text-secondary hover:bg-bg-secondary transition-colors"
            >
              <Pencil className="size-3.5" />
              <span>Sửa</span>
            </button>
            <button
              onClick={() => onDelete(topic.id)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs sm:text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="size-3.5" />
              <span>Xóa</span>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function StaffTopicsManager({ classId }: { classId: string }) {
  const queryClient = useQueryClient();
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [localTopics, setLocalTopics] = useState<Topic[]>([]);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);

  const {
    data: topicsData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["staff-topics", classId],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get(`/class/${classId}/topics`, {
        params: { page: pageParam, limit: PAGE_SIZE },
      });
      return data as TopicsPage;
    },
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.limit);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const allTopics = useMemo(
    () => (localTopics.length > 0 ? localTopics : topicsData?.pages.flatMap((p) => p.data) ?? []),
    [localTopics, topicsData],
  );

  const deleteMutation = useMutation({
    mutationFn: async (topicId: string) => {
      await api.delete(`/class/${classId}/topics/${topicId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-topics", classId] });
      setLocalTopics([]);
      setHasOrderChanged(false);
      toast.success("Đã xóa chuyên đề");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (topicIds: string[]) => {
      await api.post(`/class/${classId}/topics/reorder`, { topicIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-topics", classId] });
      setLocalTopics([]);
      setHasOrderChanged(false);
      toast.success("Đã lưu thứ tự");
    },
    onError: () => {
      toast.error("Không sắp xếp được thứ tự");
      queryClient.invalidateQueries({ queryKey: ["staff-topics", classId] });
      setLocalTopics([]);
      setHasOrderChanged(false);
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = allTopics.findIndex((t) => t.id === active.id);
      const newIndex = allTopics.findIndex((t) => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(allTopics, oldIndex, newIndex);
      setLocalTopics(reordered);
      setHasOrderChanged(true);
    },
    [allTopics],
  );

  const handleSaveOrder = useCallback(() => {
    if (!hasOrderChanged || localTopics.length === 0) return;
    reorderMutation.mutate(localTopics.map((t) => t.id));
  }, [hasOrderChanged, localTopics, reorderMutation]);

  const handleCancelOrder = useCallback(() => {
    setLocalTopics([]);
    setHasOrderChanged(false);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        {hasOrderChanged && (
          <div className="flex gap-2">
            <button
              onClick={handleCancelOrder}
              disabled={reorderMutation.isPending}
              className="cursor-pointer rounded-xl border border-border-default px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-secondary disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={handleSaveOrder}
              disabled={reorderMutation.isPending}
              className="cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {reorderMutation.isPending ? "Đang lưu..." : "Lưu thứ tự"}
            </button>
          </div>
        )}
        <div className={hasOrderChanged ? "" : "ml-auto"}>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-xs transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Plus className="size-4" />
            Tạo chuyên đề
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {allTopics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-default bg-bg-secondary/20 p-8 text-center text-sm text-text-muted">
            Chưa có bài giảng chuyên đề nào. Nhấn &ldquo;Tạo chuyên đề&rdquo; để thêm bài giảng mới.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={allTopics.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {allTopics.map((topic) => (
                <SortableTopicRow
                  key={topic.id}
                  topic={topic}
                  onEdit={setEditingTopic}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full cursor-pointer rounded-xl border border-border-default bg-bg-surface py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-secondary disabled:opacity-50 transition-colors"
          >
            {isFetchingNextPage ? "Đang tải..." : "Tải thêm chuyên đề"}
          </button>
        )}
      </div>

      {(createOpen || editingTopic) && (
        <TopicFormDialog
          classId={classId}
          topic={editingTopic}
          onClose={() => {
            setCreateOpen(false);
            setEditingTopic(null);
          }}
          onSuccess={() => {
            setCreateOpen(false);
            setEditingTopic(null);
            queryClient.invalidateQueries({ queryKey: ["staff-topics", classId] });
          }}
        />
      )}
    </>
  );
}

function TopicFormDialog({
  classId,
  topic,
  onClose,
  onSuccess,
}: {
  classId: string;
  topic: Topic | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [contentTab, setContentTab] = useState<"edit" | "preview">("edit");
  const [title, setTitle] = useState(topic?.title || "");
  const [videoUrl, setVideoUrl] = useState(topic?.videoUrl || "");
  const [content, setContent] = useState(topic?.content || "");

  const mutation = useMutation({
    mutationFn: async (data: { title: string; videoUrl: string; content: string }) => {
      if (topic) {
        await api.patch(`/class/${classId}/topics/${topic.id}`, {
          title: data.title,
          videoUrl: data.videoUrl || null,
          content: data.content || null,
        });
      } else {
        await api.post(`/class/${classId}/topics`, {
          title: data.title,
          videoUrl: data.videoUrl || null,
          content: data.content || null,
        });
      }
    },
    onSuccess: () => {
      toast.success(topic ? "Đã cập nhật chuyên đề" : "Đã tạo chuyên đề");
      onSuccess();
    },
  });

  const hasVideo = Boolean(videoUrl?.trim());

  return (
    <ResponsiveDialog onBackdropClick={onClose} size="6xl">
      <ResponsiveDialogBody className="flex flex-col p-4 sm:p-6 max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border-default pb-4 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-text-primary">
              {topic ? "Sửa chuyên đề" : "Tạo chuyên đề mới"}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Soạn thảo video bài giảng và nội dung chi tiết lý thuyết, công thức cho học sinh.
            </p>
          </div>

          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-text-muted hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Đóng"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4 pr-1 [scrollbar-width:thin] space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Tiêu đề chuyên đề <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus font-medium"
              placeholder="Ví dụ: Chuyên đề 01: Hình học không gian & Góc giữa hai mặt phẳng..."
            />
          </div>

          {/* Section 1: Video YouTube */}
          <div className="rounded-2xl border border-border-default bg-bg-secondary/30 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Video className="size-4 text-error" />
                1. Link video YouTube bài giảng
              </label>
              <span className="text-[11px] text-text-muted">Không bắt buộc</span>
            </div>
            <p className="text-xs text-text-muted">
              Dán link video YouTube (hỗ trợ dạng https://youtube.com/watch?v=... hoặc https://youtu.be/...)
            </p>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              placeholder="https://www.youtube.com/watch?v=..."
            />
            {hasVideo && (
              <div className="pt-2">
                <p className="text-xs font-medium text-text-muted mb-2">Xem thử video:</p>
                <div className="max-w-xl">
                  <YouTubeEmbed url={videoUrl} protected className="w-full aspect-video rounded-xl shadow-sm" />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: WYSIWYG Content with Preview Switcher inside card */}
          <div className="rounded-2xl border border-border-default bg-bg-secondary/30 p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <FileText className="size-4 text-primary" />
                  2. Nội dung bài giảng (WYSIWYG)
                </label>
                <span className="text-[11px] text-text-muted">Không bắt buộc</span>
              </div>

              {/* Segmented switcher between Edit and Preview inside WYSIWYG card */}
              <div
                role="tablist"
                aria-label="Chế độ soạn thảo hoặc xem trước"
                className="inline-flex items-center gap-1 rounded-xl border border-border-default bg-bg-surface p-1 shadow-2xs"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={contentTab === "edit"}
                  onClick={() => setContentTab("edit")}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all",
                    contentTab === "edit"
                      ? "bg-primary text-text-inverse shadow-xs"
                      : "text-text-muted hover:text-text-primary"
                  )}
                >
                  <Pencil className="size-3.5" />
                  <span>Soạn thảo</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={contentTab === "preview"}
                  onClick={() => setContentTab("preview")}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all",
                    contentTab === "preview"
                      ? "bg-primary text-text-inverse shadow-xs"
                      : "text-text-muted hover:text-text-primary"
                  )}
                >
                  <Eye className="size-3.5" />
                  <span>Xem trước</span>
                </button>
              </div>
            </div>

            {contentTab === "edit" ? (
              <div className="bg-bg-surface rounded-xl border border-border-default overflow-hidden">
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  minHeight="min-h-[260px] sm:min-h-[340px]"
                  placeholder="Nhập nội dung bài giảng, lý thuyết, công thức minh họa..."
                />
              </div>
            ) : (
              <div className="bg-bg-surface rounded-xl border border-border-default p-4 sm:p-5 min-h-[260px] sm:min-h-[340px] overflow-y-auto overscroll-contain [scrollbar-width:thin]">
                {content?.trim() && content.trim() !== "<p></p>" ? (
                  <MathContent content={content} />
                ) : (
                  <div className="flex h-48 items-center justify-center text-sm text-text-muted">
                    Chưa có nội dung để xem trước. Hãy chuyển sang tab Soạn thảo để nhập liệu.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-default shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-border-default px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-secondary transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate({ title, videoUrl, content })}
            disabled={!title.trim() || mutation.isPending}
            className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 shadow-xs"
          >
            {mutation.isPending
              ? "Đang lưu..."
              : topic
                ? "Cập nhật chuyên đề"
                : "Tạo chuyên đề"}
          </button>
        </div>
      </ResponsiveDialogBody>
    </ResponsiveDialog>
  );
}
