"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Download,
  GripVertical,
  ImagePlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AchievementDto,
  AchievementOwnerRef,
} from "@/dtos/achievement.dto";
import * as achievementApi from "@/lib/apis/achievement.api";
import ImageLightbox from "@/components/ui/ImageLightbox";
import { downloadAvatar, suggestAvatarFilename } from "@/lib/avatar";

type Props = {
  owner: AchievementOwnerRef;
  /**
   * When true, show a "Chỉnh sửa" control that unlocks reorder / rename / image.
   * List still starts read-only until the user enters edit mode.
   */
  editable?: boolean;
  className?: string;
  heading?: string;
};

const iconBtnClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border-default text-text-secondary hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50";

async function downloadAchievementImage(
  url: string,
  title: string,
): Promise<void> {
  const filename = suggestAvatarFilename(title || "achievement", url).replace(
    "-avatar.",
    "-achievement.",
  );
  try {
    await downloadAvatar(url, filename);
    toast.success("Đã tải ảnh minh chứng.");
  } catch {
    toast.error("Không tải được ảnh minh chứng. Vui lòng thử lại.");
  }
}

function SortableRow({
  item,
  editable,
  busy,
  onSaveTitle,
  onDelete,
  onUpload,
  onClearImage,
  onPreviewImage,
}: {
  item: AchievementDto;
  editable: boolean;
  busy: boolean;
  onSaveTitle: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onUpload: (id: string, file: File) => void;
  onClearImage: (id: string) => void;
  onPreviewImage: (src: string, title: string) => void;
}) {
  const inputId = useId();
  const fileId = useId();
  const [draft, setDraft] = useState(item.title);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !editable || busy });

  useEffect(() => {
    setDraft(item.title);
  }, [item.title]);

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  const commitTitle = () => {
    const next = draft.trim();
    if (!next || next === item.title) {
      setDraft(item.title);
      return;
    }
    onSaveTitle(item.id, next);
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-3 sm:flex-row sm:items-start sm:gap-3"
    >
      {editable ? (
        <button
          type="button"
          className={`${iconBtnClass} cursor-grab active:cursor-grabbing`}
          aria-label="Kéo để sắp xếp"
          disabled={busy}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
      ) : null}

      <div className="min-w-0 flex-1 space-y-2">
        {editable ? (
          <input
            id={inputId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            disabled={busy}
            className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            placeholder="Tiêu đề thành tích"
          />
        ) : (
          <p className="text-sm font-medium text-text-primary">{item.title}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {item.imageUrl ? (
            <button
              type="button"
              onClick={() => onPreviewImage(item.imageUrl!, item.title)}
              className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border-default focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              aria-label={`Xem ảnh: ${item.title}`}
              title="Xem ảnh"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt=""
                className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
              />
            </button>
          ) : (
            <span className="text-xs text-text-muted">Chưa có ảnh minh chứng</span>
          )}

          {item.imageUrl ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void downloadAchievementImage(item.imageUrl!, item.title)}
              className={iconBtnClass}
              aria-label="Tải ảnh minh chứng"
              title="Tải ảnh"
            >
              <Download className="h-4 w-4" aria-hidden />
            </button>
          ) : null}

          {editable ? (
            <>
              <label
                className={`${iconBtnClass} cursor-pointer`}
                aria-label={item.imageUrl ? "Đổi ảnh minh chứng" : "Tải ảnh minh chứng lên"}
                title={item.imageUrl ? "Đổi ảnh" : "Tải ảnh lên"}
              >
                <ImagePlus className="h-4 w-4" aria-hidden />
                <input
                  id={fileId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) onUpload(item.id, file);
                  }}
                />
              </label>
              {item.imageUrl ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onClearImage(item.id)}
                  className={iconBtnClass}
                  aria-label="Xoá ảnh minh chứng"
                  title="Xoá ảnh"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => onDelete(item.id)}
                className={`${iconBtnClass} border-danger/40 text-danger hover:bg-danger/5`}
                aria-label="Xoá thành tích"
                title="Xoá thành tích"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function AchievementListEditor({
  owner,
  editable = true,
  className = "",
  heading = "Thành tích",
}: Props) {
  const headingId = useId();
  const queryClient = useQueryClient();
  const queryKey = achievementApi.achievementQueryKey(owner);
  const [newTitle, setNewTitle] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [preview, setPreview] = useState<{ src: string; title: string } | null>(
    null,
  );
  const canMutate = editable && isEditing;

  const listQuery = useQuery({
    queryKey,
    queryFn: () => achievementApi.listAchievements(owner),
  });

  const items = listQuery.data ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey });

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      achievementApi.createAchievement(owner, { title }),
    onSuccess: async () => {
      setNewTitle("");
      await invalidate();
      toast.success("Đã thêm thành tích.");
    },
    onError: () => toast.error("Không thể thêm thành tích."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      achievementApi.updateAchievement(owner, id, { title }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Đã cập nhật tiêu đề.");
    },
    onError: () => toast.error("Không thể cập nhật tiêu đề."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => achievementApi.deleteAchievement(owner, id),
    onSuccess: async () => {
      await invalidate();
      toast.success("Đã xoá thành tích.");
    },
    onError: () => toast.error("Không thể xoá thành tích."),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      achievementApi.reorderAchievements(owner, { orderedIds }),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKey, data);
      toast.success("Đã cập nhật thứ tự.");
    },
    onError: async () => {
      await invalidate();
      toast.error("Không thể sắp xếp lại. Danh sách đã được tải lại.");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      achievementApi.uploadAchievementImage(owner, id, file),
    onSuccess: async () => {
      await invalidate();
      toast.success("Đã tải ảnh minh chứng.");
    },
    onError: () => toast.error("Không thể tải ảnh minh chứng."),
  });

  const clearImageMutation = useMutation({
    mutationFn: (id: string) =>
      achievementApi.deleteAchievementImage(owner, id),
    onSuccess: async () => {
      await invalidate();
      toast.success("Đã xoá ảnh minh chứng.");
    },
    onError: () => toast.error("Không thể xoá ảnh minh chứng."),
  });

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    reorderMutation.isPending ||
    uploadMutation.isPending ||
    clearImageMutation.isPending;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canMutate) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((row) => row.id === active.id);
    const newIndex = items.findIndex((row) => row.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(items, oldIndex, newIndex);
    queryClient.setQueryData(queryKey, next);
    reorderMutation.mutate(next.map((row) => row.id));
  };

  const exitEditMode = () => {
    setIsEditing(false);
    setNewTitle("");
  };

  return (
    <section
      className={`space-y-3 ${className}`}
      aria-labelledby={headingId}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {heading ? (
            <h3
              id={headingId}
              className="text-sm font-medium text-text-secondary"
            >
              {heading}
            </h3>
          ) : (
            <span id={headingId} className="sr-only">
              Thành tích
            </span>
          )}
          {editable ? (
            isEditing ? (
              <button
                type="button"
                onClick={exitEditMode}
                disabled={busy}
                className={iconBtnClass}
                aria-label="Xong chỉnh sửa"
                title="Xong"
              >
                <Check className="h-4 w-4" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className={iconBtnClass}
                aria-label="Chỉnh sửa thành tích"
                title="Chỉnh sửa"
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </button>
            )
          ) : null}
        </div>
        {listQuery.isFetching ? (
          <span className="text-xs text-text-muted">Đang tải…</span>
        ) : null}
      </div>

      {listQuery.isError ? (
        <p className="text-sm text-danger">Không tải được danh sách thành tích.</p>
      ) : null}

      {!listQuery.isLoading && items.length === 0 ? (
        <p className="text-sm text-text-muted">Chưa có thành tích nào.</p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((row) => row.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {items.map((item) => (
              <SortableRow
                key={item.id}
                item={item}
                editable={canMutate}
                busy={busy}
                onSaveTitle={(id, title) =>
                  updateMutation.mutate({ id, title })
                }
                onDelete={(id) => {
                  if (window.confirm("Xoá thành tích này?")) {
                    deleteMutation.mutate(id);
                  }
                }}
                onUpload={(id, file) =>
                  uploadMutation.mutate({ id, file })
                }
                onClearImage={(id) => clearImageMutation.mutate(id)}
                onPreviewImage={(src, title) => setPreview({ src, title })}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <ImageLightbox
        open={Boolean(preview)}
        src={preview?.src ?? ""}
        title={preview?.title}
        onClose={() => setPreview(null)}
      />

      {canMutate ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={busy}
            className="min-w-0 flex-1 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            placeholder="Thêm thành tích mới…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const title = newTitle.trim();
                if (title) createMutation.mutate(title);
              }
            }}
          />
          <button
            type="button"
            disabled={busy || !newTitle.trim()}
            onClick={() => {
              const title = newTitle.trim();
              if (title) createMutation.mutate(title);
            }}
            className={`${iconBtnClass} bg-primary text-text-inverse hover:bg-primary/90 disabled:opacity-50`}
            aria-label="Thêm thành tích"
            title="Thêm"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}
    </section>
  );
}
