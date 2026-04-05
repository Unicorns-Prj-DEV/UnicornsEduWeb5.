"use client";

import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { RegulationAudience, RegulationItem } from "@/dtos/regulation.dto";
import RegulationAudienceSelector from "./RegulationAudienceSelector";
import NotesSubjectRichEditor from "./NotesSubjectRichEditor";

export type RulePostFormValues = {
  title: string;
  description: string;
  content: string;
  audiences: RegulationAudience[];
  resourceLink: string;
  resourceLinkLabel: string;
};

export type RulePostItem = RegulationItem;

type Props = {
  open: boolean;
  onClose: () => void;
  initialData?: RulePostItem | null;
  onSubmit: (values: RulePostFormValues) => Promise<void> | void;
  /** Tiêu đề dialog (mặc định: thêm mới). */
  dialogTitle?: string;
};

const INPUT_CLASS =
  "rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus";

export default function RulePostFormPopup({
  open,
  onClose,
  initialData,
  onSubmit,
  dialogTitle = "Thêm bài quy định",
}: Props) {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<RulePostFormValues>({
    defaultValues: {
      title: "",
      description: "",
      content: "",
      audiences: [],
      resourceLink: "",
      resourceLinkLabel: "",
    },
  });

  const contentValue = useWatch({ control, name: "content" }) ?? "";
  const audiencesValue = useWatch({ control, name: "audiences" }) ?? [];
  const initializedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    register("content", {
      validate: (value) =>
        value.trim().length > 0 || "Nội dung là bắt buộc",
    });
    register("audiences", {
      validate: (value) =>
        (Array.isArray(value) && value.length > 0) ||
        "Chọn ít nhất 1 đối tượng",
    });
  }, [register]);

  useEffect(() => {
    if (!open) return;

    const key = initialData?.id ?? "__new__";
    const isNewContext = initializedKeyRef.current !== key;
    if (!isNewContext) return;

    reset({
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      content: initialData?.content ?? "",
      audiences: initialData?.audiences ?? [],
      resourceLink: initialData?.resourceLink ?? "",
      resourceLinkLabel: initialData?.resourceLinkLabel ?? "",
    });
    initializedKeyRef.current = key;
  }, [
    open,
    initialData?.id,
    initialData?.title,
    initialData?.description,
    initialData?.content,
    initialData?.audiences,
    initialData?.resourceLink,
    initialData?.resourceLinkLabel,
    reset,
  ]);

  useEffect(() => {
    if (!open) {
      initializedKeyRef.current = null;
    }
  }, [open]);

  const onFormSubmit = async (values: RulePostFormValues) => {
    await onSubmit(values);
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
            {dialogTitle}
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

          <div className="flex flex-col gap-1 text-sm text-text-secondary">
            <span>Nội dung</span>
            <NotesSubjectRichEditor
              value={contentValue}
              onChange={(html) =>
                setValue("content", html, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            {errors.content && (
              <span className="text-sm text-danger">{errors.content.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-1 text-sm text-text-secondary">
            <span>Role tag</span>
            <RegulationAudienceSelector
              value={audiencesValue}
              onChange={(nextValue) => {
                setValue("audiences", nextValue, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                if (nextValue.length > 0) {
                  clearErrors("audiences");
                }
              }}
            />
            {errors.audiences && (
              <span className="text-sm text-danger">{errors.audiences.message}</span>
            )}
          </div>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            <span>Nhãn link tài nguyên</span>
            <input
              type="text"
              {...register("resourceLinkLabel")}
              placeholder="Ví dụ: Mở tài nguyên"
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            <span>Link tài nguyên</span>
            <input
              type="url"
              {...register("resourceLink")}
              placeholder="https://..."
              className={INPUT_CLASS}
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
