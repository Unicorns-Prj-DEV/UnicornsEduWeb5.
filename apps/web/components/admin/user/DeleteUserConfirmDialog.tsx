"use client";

import type { UserDetailWithStaff } from "@/dtos/user.dto";
import { getUserDisplayName } from "@/lib/user-manage-form";

type Props = {
  user: UserDetailWithStaff;
  softDeleteNotice?: string | null;
  open: boolean;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function DeleteUserConfirmDialog({
  user,
  softDeleteNotice = null,
  open,
  isPending,
  onClose,
  onConfirm,
}: Props) {
  if (!open) return null;

  const displayName =
    getUserDisplayName(user) || user.accountHandle || user.email;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-bg-primary/75 backdrop-blur-[1px]"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-user-title"
        className="fixed left-1/2 top-1/2 z-[70] max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border-default bg-bg-surface p-4 shadow-2xl sm:p-5"
      >
        <div className="flex items-start gap-3">
          <div className="mt-1 flex size-11 items-center justify-center rounded-full bg-error/10 text-error sm:size-9">
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v4m0 4h.01M5.1 19h13.8a2 2 0 001.79-2.89L13.79 4.79a2 2 0 00-3.58 0L3.31 16.11A2 2 0 005.1 19z"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="delete-user-title"
              className="text-base font-semibold text-text-primary"
            >
              Xóa user?
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Bạn có chắc muốn xóa user{" "}
              <span className="font-semibold text-text-primary">{displayName}</span>
              ? Hành động này không thể hoàn tác.
              {softDeleteNotice ? (
                <span className="mt-2 block rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-text-primary">
                  {softDeleteNotice}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="min-h-10 flex-1 rounded-md border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-5"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="min-h-10 flex-1 rounded-md border border-error bg-error px-4 py-2.5 text-sm font-medium text-text-inverse shadow-sm transition-colors hover:bg-error/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-5"
          >
            {isPending ? "Đang xóa…" : "Xóa user"}
          </button>
        </div>
      </div>
    </>
  );
}
