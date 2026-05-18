"use client";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isSubmitting?: boolean;
};

export default function LessonDeleteConfirmPopup({
  open,
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  isSubmitting = false,
}: Props) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-bg-primary/75"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-delete-popup-title"
        className="fixed inset-x-3 top-1/2 z-50 -translate-y-1/2 rounded-[1.5rem] border border-border-default bg-bg-surface p-5 shadow-xl sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2"
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
              id="lesson-delete-popup-title"
              className="text-lg font-semibold text-text-primary"
            >
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isSubmitting}
          className="rounded-xl bg-error px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-error/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
          >
            {isSubmitting ? "Đang xử lý…" : confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
