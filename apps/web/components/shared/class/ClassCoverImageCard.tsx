"use client";

import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ClassCoverArt } from "@/components/shared/class/ClassCoverArt";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClassCoverImage } from "@/dtos/class.dto";
import * as classApi from "@/lib/apis/class.api";
import { getMutationErrorMessage } from "@/lib/mutation-feedback";
import { classKeys, studentSelfKeys } from "@/lib/query-keys";

const ACCEPTED_COVER_TYPES = "image/jpeg,image/png,image/webp";

const actionButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9";

type ClassCoverImageCardProps = {
  classId: string;
};

/**
 * Ảnh bìa lớp trên trang chi tiết lớp (admin + staff). Ai xem được lớp đều thấy ảnh;
 * nút đổi/gỡ chỉ hiện khi backend trả `canManage`.
 */
export function ClassCoverImageCard({ classId }: ClassCoverImageCardProps) {
  const queryClient = useQueryClient();
  const fileInputId = useId();
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const coverQuery = useQuery<ClassCoverImage>({
    queryKey: classKeys.coverImage(classId),
    queryFn: () => classApi.getClassCoverImage(classId),
    enabled: Boolean(classId),
    staleTime: 5 * 60_000,
  });

  const applyCoverResult = (result: ClassCoverImage) => {
    queryClient.setQueryData(classKeys.coverImage(classId), result);
    void queryClient.invalidateQueries({ queryKey: studentSelfKeys.classes() });
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => classApi.uploadClassCoverImage(classId, file),
    onSuccess: (result) => {
      applyCoverResult(result);
      toast.success("Đã cập nhật ảnh bìa lớp.");
    },
    onError: (error) =>
      toast.error(getMutationErrorMessage(error, "Không tải được ảnh bìa lớp.")),
  });

  const removeMutation = useMutation({
    mutationFn: () => classApi.removeClassCoverImage(classId),
    onSuccess: (result) => {
      applyCoverResult(result);
      setConfirmRemoveOpen(false);
      toast.success("Đã gỡ ảnh bìa, thẻ lớp sẽ hiện mascot.");
    },
    onError: (error) =>
      toast.error(getMutationErrorMessage(error, "Không gỡ được ảnh bìa lớp.")),
  });

  if (coverQuery.isLoading) {
    return <Skeleton className="mb-4 aspect-[16/9] w-full rounded-2xl sm:max-w-sm" />;
  }

  // Lỗi tải ảnh bìa không chặn trang chi tiết lớp; ẩn khối này.
  if (coverQuery.isError || !coverQuery.data) return null;

  const { coverImageUrl, canManage } = coverQuery.data;
  const busy = uploadMutation.isPending || removeMutation.isPending;

  return (
    <section
      className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end"
      aria-label="Ảnh bìa lớp"
    >
      <ClassCoverArt
        classId={classId}
        coverImageUrl={coverImageUrl}
        className="w-full rounded-2xl border border-border-default sm:max-w-sm"
      />

      {canManage ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-muted">
            {coverImageUrl
              ? "Ảnh bìa hiện trên thẻ lớp của học sinh."
              : "Chưa có ảnh bìa — thẻ lớp đang hiện mascot."}{" "}
            JPG, PNG hoặc WEBP, tối đa 5MB.
          </p>
          <div className="flex flex-wrap gap-2">
            <label
              htmlFor={fileInputId}
              className={`${actionButtonClass} cursor-pointer border-border-default bg-bg-surface text-text-primary hover:bg-bg-secondary ${busy ? "pointer-events-none opacity-60" : ""}`}
            >
              <ImagePlus className="size-4" aria-hidden />
              {uploadMutation.isPending
                ? "Đang tải..."
                : coverImageUrl
                  ? "Đổi ảnh bìa"
                  : "Tải ảnh bìa"}
            </label>
            <input
              id={fileInputId}
              type="file"
              accept={ACCEPTED_COVER_TYPES}
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) uploadMutation.mutate(file);
              }}
            />
            {coverImageUrl ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmRemoveOpen(true)}
                className={`${actionButtonClass} border-error/40 bg-bg-surface text-error hover:bg-error/5`}
              >
                <Trash2 className="size-4" aria-hidden />
                Gỡ ảnh
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        title="Gỡ ảnh bìa lớp?"
        description="Thẻ lớp của học sinh sẽ quay về hiện mascot kỳ lân."
        confirmLabel="Gỡ ảnh"
        variant="destructive"
        confirmPending={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate()}
      />
    </section>
  );
}
