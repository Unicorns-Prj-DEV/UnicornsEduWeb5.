"use client";

import type { ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isSubmitting?: boolean;
  /** Stack above an already-open dialog (edit popup, etc.). */
  nested?: boolean;
  labelledBy?: string;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Hủy",
  onClose,
  onConfirm,
  isSubmitting = false,
  nested = false,
  labelledBy = "confirm-dialog-title",
}: Props) {
  if (!open) return null;

  return (
    <>
      <div
        className={
          nested
            ? "fixed inset-0 z-[70] bg-bg-primary/75"
            : "fixed inset-0 z-40 bg-bg-primary/75"
        }
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={
          nested
            ? "fixed inset-x-3 top-1/2 z-[80] max-h-[calc(100dvh-1.5rem)] -translate-y-1/2 overflow-y-auto rounded-[1.5rem] border border-border-default bg-bg-surface p-5 shadow-xl sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2"
            : "fixed inset-x-3 top-1/2 z-50 max-h-[calc(100dvh-1.5rem)] -translate-y-1/2 overflow-y-auto rounded-[1.5rem] border border-border-default bg-bg-surface p-5 shadow-xl sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2"
        }
      >
        <div className="space-y-3">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-error/12 text-error">
            <svg
              className="size-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
              />
            </svg>
          </div>
          <div>
            <h2
              id={labelledBy}
              className="text-lg font-semibold text-text-primary"
            >
              {title}
            </h2>
            <div className="mt-2 space-y-2 text-sm leading-6 text-text-secondary">
              {description}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60 sm:min-h-10"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isSubmitting}
            className="min-h-11 rounded-xl bg-error px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-error/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60 sm:min-h-10"
          >
            {isSubmitting ? "Đang xử lý…" : confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
