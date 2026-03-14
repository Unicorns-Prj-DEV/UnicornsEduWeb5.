"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import NotesSubjectRichEditor from "./NotesSubjectRichEditor";

export type RulePostFormValues = {
  title: string;
  description: string;
  content: string;
};

export type RulePostItem = {
  id: string;
  title: string;
  description: string;
  content: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  initialData?: RulePostItem | null;
  onSubmit: (values: RulePostFormValues) => void;
};

const INPUT_CLASS =
  "rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus";

export default function RulePostFormPopup({
  open,
  onClose,
  initialData,
  onSubmit,
}: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RulePostFormValues>({
    defaultValues: { title: "", description: "", content: "" },
  });

  const contentValue = watch("content");

  useEffect(() => {
    if (!open) return;
    reset({
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      content: initialData?.content ?? "",
    });
  }, [open, initialData, reset]);

  const onFormSubmit = (values: RulePostFormValues) => {
    onSubmit(values);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rule-post-form-title"
        className="fixed inset-x-3 top-1/2 z-50 max-h-[88vh] -translate-y-1/2 overflow-y-auto rounded-xl border border-border-default bg-bg-surface p-4 shadow-xl sm:left-1/2 sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2
            id="rule-post-form-title"
            className="text-lg font-semibold text-text-primary"
          >
            Thêm bài quy định
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-muted transition-colors duration-200 hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Đóng"
          >
            <svg
              className="size-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            <span>Tiêu đề</span>
            <input
              type="text"
              {...register("title", { required: "Tiêu đề là bắt buộc" })}
              placeholder="Nhập tiêu đề"
              className={INPUT_CLASS}
            />
            {errors.title && (
              <span className="text-sm text-danger">{errors.title.message}</span>
            )}
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            <span>Mô tả</span>
            <input
              type="text"
              {...register("description")}
              placeholder="Nhập mô tả ngắn"
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            <span>Nội dung</span>
            <NotesSubjectRichEditor
              value={contentValue}
              onChange={(html) => setValue("content", html, { shouldDirty: true })}
            />
          </label>

          <div className="flex items-center justify-end gap-2 border-t border-border-default pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
            >
              Lưu
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
