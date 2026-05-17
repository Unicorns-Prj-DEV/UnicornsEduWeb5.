"use client";

import {
  CheckBadgeIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";

type Props = {
  email: string;
  verified: boolean;
  /**
   * Email không phải email đăng nhập — không hiển thị icon xác minh tài khoản / CTA gửi link.
   */
  notApplicableMessage?: string;
  /** Khi chưa xác minh: bấm để gửi link xác minh (mock hoặc API). */
  onRequestVerify?: () => void;
  verifyPending?: boolean;
};

/**
 * Dòng email: icon trạng thái; nếu chưa xác minh có thể thêm nút «Xác minh email →→».
 */
export default function EmailVerificationInline({
  email,
  verified,
  notApplicableMessage,
  onRequestVerify,
  verifyPending = false,
}: Props) {
  const empty = !email.trim() || email === "—";

  if (empty) {
    return <span className="text-text-muted">-</span>;
  }

  if (notApplicableMessage?.trim()) {
    return (
      <span className="inline-flex min-w-0 flex-col gap-1">
        <span className="break-all text-text-primary">{email}</span>
        <span className="text-xs leading-relaxed text-text-muted">{notApplicableMessage.trim()}</span>
      </span>
    );
  }

  const showVerifyCta = !verified && typeof onRequestVerify === "function";

  return (
    <span className="inline-flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
      <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
        <span className="break-all">{email}</span>
        {verified ? (
          <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
            <span
              className="inline-flex shrink-0 items-center rounded-full p-0.5 ring-1 ring-[color-mix(in_srgb,var(--ue-success)_35%,transparent)]"
              title="Email đã xác minh"
              aria-label="Email đã xác minh"
            >
              <CheckBadgeIcon
                className="size-5 text-[color:var(--ue-success)]"
                aria-hidden
              />
            </span>
            <span className="text-xs font-semibold text-[color:var(--ue-success)]">Đã xác minh</span>
          </span>
        ) : (
          <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
            <span
              className="inline-flex shrink-0 items-center rounded-full p-0.5 ring-1 ring-[color-mix(in_srgb,var(--ue-warning)_40%,transparent)]"
              title="Email chưa xác minh"
              aria-label="Email chưa xác minh"
            >
              <ExclamationTriangleIcon
                className="size-5 text-[color:var(--ue-warning)]"
                aria-hidden
              />
            </span>
            <span className="text-xs font-semibold text-[color:var(--ue-warning)]">Chưa xác minh</span>
          </span>
        )}
      </span>

      {showVerifyCta ? (
        <button
          type="button"
          onClick={onRequestVerify}
          disabled={verifyPending}
          className="inline-flex w-fit max-w-full shrink-0 items-center justify-center gap-2 rounded-full border border-primary/35 bg-[color-mix(in_srgb,var(--ue-primary)_8%,transparent)] px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-[color-mix(in_srgb,var(--ue-primary)_14%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{verifyPending ? "Đang gửi…" : "Xác minh email"}</span>
          <span className="select-none font-bold tabular-nums tracking-tight text-primary" aria-hidden>
            →→
          </span>
        </button>
      ) : null}
    </span>
  );
}
