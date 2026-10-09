"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as sharedMaterialApi from "@/lib/apis/shared-material.api";
import { sharedMaterialKeys } from "@/lib/query-keys";
import {
  ResponsiveActionFooter,
  ResponsiveDialog,
  ResponsiveDialogBody,
} from "@/components/ui/ResponsiveDialog";
import {
  confirmUnsavedClose,
  useConfirmDialog,
} from "@/components/ui/ConfirmDialog";
import MathRichTextEditor from "@/components/ui/MathRichTextEditor";
import {
  SHARED_MATERIAL_TITLE_MAX,
  type SharedMaterial,
} from "@/dtos/shared-material.dto";

/** Soạn / sửa một Tư liệu dùng chung (đoạn văn, ảnh). */
export default function SharedMaterialFormDialog({
  courseId,
  material,
  onClose,
}: {
  courseId: string;
  material: SharedMaterial | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const initial = {
    title: material?.title ?? "",
    content: material?.content ?? "",
  };
  const [form, setForm] = useState(initial);

  const saveMutation = useMutation({
    mutationFn: () =>
      material
        ? sharedMaterialApi.updateSharedMaterial(material.id, form)
        : sharedMaterialApi.createSharedMaterial({ courseId, ...form }),
    onSuccess: async () => {
      toast.success(material ? "Đã cập nhật tư liệu." : "Đã tạo tư liệu.");
      await queryClient.invalidateQueries({
        queryKey: sharedMaterialKeys.course(courseId),
      });
      onClose();
    },
    onError: () => toast.error("Không thể lưu tư liệu."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Nhập tên tư liệu.");
      return;
    }
    if (
      !form.content.replace(/<[^>]*>/g, "").trim() &&
      !/<img/i.test(form.content)
    ) {
      toast.error("Tư liệu chưa có nội dung.");
      return;
    }
    saveMutation.mutate();
  };

  const { confirm, dialog } = useConfirmDialog();
  const isDirty = JSON.stringify(form) !== JSON.stringify(initial);
  const requestClose = async () => {
    if (await confirmUnsavedClose(confirm, isDirty)) onClose();
  };

  return (
    <>
      <ResponsiveDialog
        size="3xl"
        labelledBy="shared-material-form-title"
        onBackdropClick={() => void requestClose()}
      >
        <div className="border-b border-border-default px-4 py-3 md:px-6">
          <h2
            id="shared-material-form-title"
            className="text-lg font-bold text-text-primary"
          >
            {material ? "Sửa tư liệu" : "Thêm tư liệu dùng chung"}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <ResponsiveDialogBody className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-text-muted">
                Tên (chỉ người soạn thấy)
              </span>
              <input
                value={form.title}
                maxLength={SHARED_MATERIAL_TITLE_MAX}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Vd: Bài đọc お花見"
                className="min-h-11 w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-base text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:text-sm"
              />
            </label>
            <div>
              <span className="mb-1 block text-xs font-medium text-text-muted">
                Nội dung (đoạn văn, ảnh)
              </span>
              <MathRichTextEditor
                value={form.content}
                onChange={(next) =>
                  setForm((prev) => ({ ...prev, content: next }))
                }
                ariaLabel="Nội dung tư liệu"
                placeholder="Dán đoạn văn hoặc chèn ảnh..."
                minHeight="min-h-[200px]"
              />
            </div>
            {material && material.questionCount > 0 ? (
              <p className="text-xs text-text-muted">
                Đang có {material.questionCount} câu dùng tư liệu này. Bài làm
                đã bắt đầu giữ nội dung cũ.
              </p>
            ) : null}
          </ResponsiveDialogBody>
          <ResponsiveActionFooter>
            <button
              type="button"
              onClick={() => void requestClose()}
              className="rounded-md border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary/40"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-primary/90 disabled:opacity-50"
            >
              {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
            </button>
          </ResponsiveActionFooter>
        </form>
      </ResponsiveDialog>
      {dialog}
    </>
  );
}
