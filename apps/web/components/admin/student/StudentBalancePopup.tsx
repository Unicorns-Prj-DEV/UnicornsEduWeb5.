"use client";

import { useMemo, useState, type SyntheticEvent } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import * as studentApi from "@/lib/apis/student.api";
import { formatCurrency } from "@/lib/class.helpers";
import { runBackgroundSave } from "@/lib/mutation-feedback";

type BalanceMode = "topup" | "withdraw";

type BalanceSubject = {
  id: string;
  fullName?: string | null;
  accountBalance?: number | null;
};

type BalanceModeCopy = {
  eyebrow: string;
  title: string;
  description: string;
  submitLabel: string;
  deltaPrefix: string;
  chipClass: string;
  chipLabel: string;
};

type Props = {
  open: boolean;
  mode: BalanceMode;
  onClose: () => void;
  student: BalanceSubject;
  onSuccess?: () => void | Promise<void>;
  submitBalanceChange?: (amount: number) => Promise<unknown>;
  invalidateQueryKeys?: QueryKey[];
  allowNegativeBalance?: boolean;
  copyOverrides?: Partial<Record<BalanceMode, Partial<BalanceModeCopy>>>;
  successTargetLabel?: string;
  errorMessages?: Partial<Record<BalanceMode, string>>;
  blockedNegativeBalanceMessage?: string;
};

const MODE_COPY: Record<BalanceMode, BalanceModeCopy> = {
  topup: {
    eyebrow: "Top Up",
    title: "Nạp tiền vào tài khoản",
    description:
      "Nhập số dương để tăng số dư, số âm để giảm số dư (cùng hiệu lực với rút). Chỉ chấp nhận số nguyên khác 0.",
    submitLabel: "Xác nhận thay đổi số dư",
    deltaPrefix: "+",
    chipClass: "bg-primary/10 text-primary ring-primary/20",
    chipLabel: "Cộng vào số dư",
  },
  withdraw: {
    eyebrow: "Withdraw",
    title: "Rút tiền khỏi tài khoản",
    description: "Số tiền nhập vào sẽ được trừ trực tiếp khỏi số dư hiện tại của học sinh.",
    submitLabel: "Xác nhận rút tiền",
    deltaPrefix: "-",
    chipClass: "bg-warning/15 text-text-primary ring-warning/20",
    chipLabel: "Trừ khỏi số dư",
  },
};

function balanceClassName(value: number): string {
  return value < 0 ? "text-error" : "text-text-primary";
}

export default function StudentBalancePopup({
  open,
  mode,
  onClose,
  student,
  onSuccess,
  submitBalanceChange,
  invalidateQueryKeys,
  allowNegativeBalance = true,
  copyOverrides,
  successTargetLabel,
  errorMessages,
  blockedNegativeBalanceMessage = "Số dư hiện tại không đủ để rút số tiền này.",
}: Props) {
  const queryClient = useQueryClient();
  const [amountInput, setAmountInput] = useState("");

  const currentBalance = student.accountBalance ?? 0;
  const rawAmount = amountInput.trim() === "" ? Number.NaN : Number(amountInput.trim());
  const withdrawAmount =
    Number.isFinite(rawAmount) && Number.isInteger(rawAmount) && rawAmount > 0 ? rawAmount : 0;
  const signedTopUpAmount =
    Number.isFinite(rawAmount) && Number.isInteger(rawAmount) && rawAmount !== 0 ? rawAmount : 0;
  const hasValidAmount = mode === "topup" ? signedTopUpAmount !== 0 : withdrawAmount > 0;
  const deltaAmount = mode === "topup" ? signedTopUpAmount : -withdrawAmount;
  const nextBalance = currentBalance + deltaAmount;
  const modeCopy = {
    ...MODE_COPY[mode],
    ...(copyOverrides?.[mode] ?? {}),
  };
  const studentName = student.fullName?.trim() || "Học sinh";
  const queryKeysToInvalidate = invalidateQueryKeys ?? [
    ["student", "detail", student.id],
    ["student", "list"],
    ["student", "wallet-history", student.id],
  ];

  const impactDisplay = !hasValidAmount
    ? "Nhập số tiền"
    : `${deltaAmount >= 0 ? "+" : "-"}${formatCurrency(Math.abs(deltaAmount))}`;

  const impactClassName = !hasValidAmount
    ? "text-text-muted"
    : mode === "withdraw" || deltaAmount < 0
      ? "text-warning"
      : "text-primary";

  const impactChip = useMemo(() => {
    if (mode === "withdraw") {
      return { chipClass: MODE_COPY.withdraw.chipClass, chipLabel: MODE_COPY.withdraw.chipLabel };
    }
    if (!hasValidAmount) {
      return { chipClass: MODE_COPY.topup.chipClass, chipLabel: MODE_COPY.topup.chipLabel };
    }
    if (deltaAmount < 0) {
      return { chipClass: MODE_COPY.withdraw.chipClass, chipLabel: "Trừ khỏi số dư" };
    }
    return { chipClass: MODE_COPY.topup.chipClass, chipLabel: MODE_COPY.topup.chipLabel };
  }, [mode, hasValidAmount, deltaAmount]);

  const summaryItems = useMemo(
    () => [
      {
        label: "Hiện tại",
        value: formatCurrency(currentBalance),
        className: balanceClassName(currentBalance),
      },
      {
        label: "Tác động",
        value: impactDisplay,
        className: impactClassName,
      },
      {
        label: "Sau giao dịch",
        value: formatCurrency(nextBalance),
        className: balanceClassName(nextBalance),
      },
    ],
    [currentBalance, impactClassName, impactDisplay, nextBalance],
  );

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasValidAmount) {
      toast.error(
        mode === "topup"
          ? "Vui lòng nhập số nguyên khác 0 (có thể âm để giảm số dư)."
          : "Vui lòng nhập số nguyên lớn hơn 0.",
      );
      return;
    }

    if (!allowNegativeBalance && nextBalance < 0) {
      toast.error(blockedNegativeBalanceMessage);
      return;
    }

    onClose();
    runBackgroundSave({
      loadingMessage:
        mode === "withdraw"
          ? "Đang rút tiền..."
          : deltaAmount < 0
            ? "Đang cập nhật số dư..."
            : "Đang nạp tiền...",
      successMessage:
        mode === "withdraw"
          ? `Đã rút ${formatCurrency(withdrawAmount)} khỏi ${successTargetLabel ?? `tài khoản của ${studentName}`}.`
          : deltaAmount < 0
            ? `Đã giảm ${formatCurrency(Math.abs(deltaAmount))} trên ${successTargetLabel ?? studentName}.`
            : `Đã nạp ${formatCurrency(deltaAmount)} cho ${successTargetLabel ?? studentName}.`,
      errorMessage:
        errorMessages?.[mode] ??
        (mode === "topup"
          ? "Không thể thay đổi số dư học sinh."
          : "Không thể rút tiền khỏi tài khoản học sinh."),
      action: () =>
        submitBalanceChange
          ? submitBalanceChange(deltaAmount)
          : studentApi.updateStudentAccountBalance({
              student_id: student.id,
              amount: deltaAmount,
            }),
      onSuccess: async () => {
        await Promise.all(
          queryKeysToInvalidate.map((queryKey) =>
            queryClient.invalidateQueries({ queryKey }),
          ),
        );
        await onSuccess?.();
      },
    });
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]" aria-hidden onClick={handleClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-balance-popup-title"
        className="fixed inset-x-3 bottom-3 top-20 z-50 flex max-h-[calc(100vh-5rem)] flex-col overflow-hidden overscroll-contain rounded-[1.75rem] border border-border-default bg-bg-surface shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90vh] sm:w-[min(34rem,calc(100%-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2"
      >
        <div className="border-b border-border-default bg-gradient-to-r from-bg-secondary via-bg-surface to-bg-secondary/70 px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                {modeCopy.eyebrow}
              </p>
              <h2 id="student-balance-popup-title" className="mt-1 text-lg font-semibold text-text-primary">
                {modeCopy.title}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">{studentName}</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-border-default bg-bg-surface p-2 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              aria-label="Đóng"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="grid gap-4">
            <section className="rounded-2xl border border-border-default bg-bg-secondary/50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${impactChip.chipClass}`}>
                  {impactChip.chipLabel}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-text-secondary">{modeCopy.description}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {summaryItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.1rem] border border-border-default bg-bg-surface px-3.5 py-3 shadow-sm"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {item.label}
                    </p>
                    <p className={`mt-2 text-sm font-semibold tabular-nums sm:text-base ${item.className}`}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <label className="mt-4 flex flex-col gap-1 text-sm text-text-secondary">
                <span>Số tiền</span>
                <input
                  name="amount"
                  type="number"
                  {...(mode === "withdraw" ? { min: 0 } : {})}
                  step={1}
                  inputMode="numeric"
                  autoComplete="off"
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  placeholder={mode === "topup" ? "Ví dụ: 500000 hoặc -200000…" : "Ví dụ: 500000…"}
                />
              </label>

              {nextBalance < 0 && hasValidAmount && (mode === "withdraw" || deltaAmount < 0) ? (
                <p className="mt-3 rounded-xl border border-error/20 bg-error/10 px-3 py-2 text-sm text-error">
                  {allowNegativeBalance
                    ? `Sau giao dịch, tài khoản sẽ âm ${formatCurrency(Math.abs(nextBalance))}.`
                    : blockedNegativeBalanceMessage}
                </p>
              ) : null}
            </section>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="min-h-11 rounded-md border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="min-h-11 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition hover:bg-[var(--ue-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              {modeCopy.submitLabel}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
