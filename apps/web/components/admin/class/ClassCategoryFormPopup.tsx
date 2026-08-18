"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { toast } from "sonner";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveActionFooter,
} from "@/components/ui/ResponsiveDialog";
import type { ClassCategory } from "@/dtos/class.dto";

export type ClassCategoryFormValues = {
  name: string;
  sortOrder: number;
};

type Props = {
  open: boolean;
  category: ClassCategory | null;
  onClose: () => void;
  onSubmit: (values: ClassCategoryFormValues) => Promise<void>;
};

export default function ClassCategoryFormPopup({ open, category, onClose, onSubmit }: Props) {
  const isEdit = Boolean(category);
  const [name, setName] = useState("");
  const [sortOrderInput, setSortOrderInput] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setSortOrderInput(String(category?.sortOrder ?? 0));
  }, [open, category]);

  if (!open) return null;

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Tên phân loại là bắt buộc.");
      return;
    }
    const sortOrder = Number(sortOrderInput);
    if (!Number.isFinite(sortOrder)) {
      toast.error("Thứ tự hiển thị không hợp lệ.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ name: trimmedName, sortOrder: Math.trunc(sortOrder) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog labelledBy="class-category-form-title" onBackdropClick={onClose}>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-border-subtle p-4 sm:p-5">
          <h2 id="class-category-form-title" className="text-lg font-semibold text-text-primary">
            {isEdit ? "Sửa phân loại lớp" : "Thêm phân loại lớp"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-muted transition-colors duration-200 hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Đóng"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ResponsiveDialogBody className="space-y-4">
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            <span>Tên hiển thị</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            <span>Thứ tự hiển thị</span>
            <input
              type="number"
              value={sortOrderInput}
              onChange={(e) => setSortOrderInput(e.target.value)}
              className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            />
          </label>
        </ResponsiveDialogBody>

        <ResponsiveActionFooter>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary sm:min-h-10"
          >
            Huỷ
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors duration-200 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10"
          >
            {submitting ? "Đang lưu..." : "Lưu"}
          </button>
        </ResponsiveActionFooter>
      </form>
    </ResponsiveDialog>
  );
}
