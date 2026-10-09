"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as sharedMaterialApi from "@/lib/apis/shared-material.api";
import { sharedMaterialKeys } from "@/lib/query-keys";
import { useSharedMaterials } from "@/lib/hooks/useSharedMaterials";
import {
  ResponsiveActionFooter,
  ResponsiveDialog,
  ResponsiveDialogBody,
} from "@/components/ui/ResponsiveDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import MathContent from "@/components/ui/MathContent";
import { Skeleton } from "@/components/ui/skeleton";
import SharedMaterialFormDialog from "@/components/admin/question-bank/SharedMaterialFormDialog";
import type { SharedMaterial } from "@/dtos/shared-material.dto";

/**
 * Danh sách Tư liệu dùng chung của khoá: tạo / sửa / xoá. Gắn câu vào tư liệu
 * làm trong form câu hỏi. Tư liệu còn câu gắn thì không xoá được (API 409).
 */
export default function SharedMaterialsDialog({
  courseId,
  canMutate,
  onClose,
}: {
  courseId: string;
  canMutate: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: materials = [], isLoading } = useSharedMaterials(courseId);
  const [editing, setEditing] = useState<SharedMaterial | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SharedMaterial | null>(null);

  const deleteMutation = useMutation({
    mutationFn: sharedMaterialApi.deleteSharedMaterial,
    onSuccess: async () => {
      toast.success("Đã xoá tư liệu.");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({
        queryKey: sharedMaterialKeys.course(courseId),
      });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || "Không thể xoá tư liệu.");
    },
  });

  return (
    <>
      <ResponsiveDialog
        size="2xl"
        labelledBy="shared-materials-title"
        onBackdropClick={onClose}
      >
        <div className="border-b border-border-default px-4 py-3 md:px-6">
          <h2
            id="shared-materials-title"
            className="text-lg font-bold text-text-primary"
          >
            Tư liệu dùng chung
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Đoạn văn / ảnh nhiều câu cùng dựa vào. Câu cùng tư liệu luôn đứng
            liền nhau trong đề, tư liệu hiện một lần.
          </p>
        </div>
        <ResponsiveDialogBody className="space-y-3">
          {isLoading ? (
            <div
              className="space-y-2"
              role="status"
              aria-label="Đang tải tư liệu"
            >
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : materials.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-default p-6 text-center text-sm text-text-muted">
              Chưa có tư liệu nào.
            </p>
          ) : (
            <ul className="space-y-2">
              {materials.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start gap-2 rounded-lg border border-border-default p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {m.title}
                    </p>
                    <MathContent
                      content={m.content}
                      className="mt-1 line-clamp-2 text-xs text-text-secondary"
                    />
                    <p className="mt-1 text-xs text-text-muted">
                      {m.questionCount} câu
                    </p>
                  </div>
                  {canMutate ? (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(m)}
                        className="inline-flex size-11 items-center justify-center rounded-md text-text-muted hover:bg-bg-secondary sm:size-9"
                        aria-label={`Sửa tư liệu ${m.title}`}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(m)}
                        className="inline-flex size-11 items-center justify-center rounded-md text-text-muted hover:bg-error/10 hover:text-error sm:size-9"
                        aria-label={`Xoá tư liệu ${m.title}`}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </ResponsiveDialogBody>
        <ResponsiveActionFooter>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary/40"
          >
            Đóng
          </button>
          {canMutate ? (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-primary/90"
            >
              + Thêm tư liệu
            </button>
          ) : null}
        </ResponsiveActionFooter>
      </ResponsiveDialog>

      {editing ? (
        <SharedMaterialFormDialog
          courseId={courseId}
          material={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title="Xoá tư liệu"
          description={
            deleteTarget.questionCount > 0
              ? `Tư liệu đang được ${deleteTarget.questionCount} câu dùng — bỏ gắn các câu trước khi xoá.`
              : `Xoá tư liệu “${deleteTarget.title}”? Hành động này không thể hoàn tác.`
          }
          confirmLabel="Xoá"
          cancelLabel="Huỷ"
          variant="destructive"
          confirmPending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        />
      ) : null}
    </>
  );
}
