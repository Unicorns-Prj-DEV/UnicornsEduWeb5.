"use client";

import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { StudentDetail } from "@/dtos/student.dto";
import * as studentApi from "@/lib/apis/student.api";
import { formatCurrency } from "@/lib/class.helpers";

type BalanceMode = "topup" | "withdraw";

type Props = {
  open: boolean;
  mode: BalanceMode;
  onClose: () => void;
  student: StudentDetail;
  onSuccess?: () => void | Promise<void>;
  onTransactionCommitted?: (tx: {
    type: BalanceMode;
    amount: number;
    deltaAmount: number;
    createdAt: string;
  }) => void;
};

const MODE_COPY: Record<
  BalanceMode,
  {
    eyebrow: string;
    title: string;
    description: string;
    submitLabel: string;
    deltaPrefix: string;
    chipClass: string;
    chipLabel: string;
  }
> = {
  topup: {
    eyebrow: "Top Up",
    title: "Nạp tiền vào tài khoản",
    description: "Số tiền nhập vào sẽ được cộng trực tiếp vào số dư hiện tại của học sinh.",
    submitLabel: "Xác nhận nạp tiền",
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

function getErrorMessage(error: unknown, fallback: string): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    (error as Error)?.message ??
    fallback
  );
}

function balanceClassName(value: number): string {
  return value < 0 ? "text-error" : "text-text-primary";
}

export default function StudentBalancePopup({
  open,
  mode,
  onClose,
  student,
  onSuccess,
  onTransactionCommitted,
}: Props) {
  const queryClient = useQueryClient();
  const [amountInput, setAmountInput] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmountInput("");
  }, [open, mode, student.id]);

  const currentBalance = student.accountBalance ?? 0;
  const rawAmount = amountInput.trim() === "" ? Number.NaN : Number(amountInput.trim());
  const normalizedAmount = Number.isFinite(rawAmount) && rawAmount > 0 ? Math.round(rawAmount) : 0;
  const hasValidAmount = normalizedAmount > 0;
  const deltaAmount = mode === "topup" ? normalizedAmount : -normalizedAmount;
  const nextBalance = currentBalance + deltaAmount;
  const modeCopy = MODE_COPY[mode];
  const studentName = student.fullName?.trim() || "Học sinh";

  const summaryItems = useMemo(
    () => [
      {
        label: "Hiện tại",
        value: formatCurrency(currentBalance),
        className: balanceClassName(currentBalance),
      },
      {
        label: "Tác động",
        value: hasValidAmount
          ? `${modeCopy.deltaPrefix}${formatCurrency(normalizedAmount)}`
          : "Nhập số tiền",
        className: hasValidAmount
          ? mode === "withdraw"
            ? "text-warning"
            : "text-primary"
          : "text-text-muted",
      },
      {
        label: "Sau giao dịch",
        value: formatCurrency(nextBalance),
        className: balanceClassName(nextBalance),
      },
    ],
    [currentBalance, hasValidAmount, mode, modeCopy.deltaPrefix, nextBalance, normalizedAmount],
  );

  const balanceMutation = useMutation({
    mutationFn: (amount: number) =>
      studentApi.updateStudentAccountBalance({
        student_id: student.id,
        amount,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["student", "detail", student.id] }),
        queryClient.invalidateQueries({ queryKey: ["student", "list"] }),
      ]);
      await onSuccess?.();
    },
    onError: (error: unknown) => {
      toast.error(
        getErrorMessage(
          error,
          mode === "topup"
            ? "Không thể nạp tiền cho học sinh."
            : "Không thể rút tiền khỏi tài khoản học sinh.",
        ),
      );
    },
  });

  const handleClose = () => {
    if (balanceMutation.isPending) return;
    onClose();
  };

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasValidAmount) {
      toast.error("Vui lòng nhập số tiền lớn hơn 0.");
      return;
    }

    try {
      await balanceMutation.mutateAsync(deltaAmount);
      toast.success(
        mode === "topup"
          ? `Đã nạp ${formatCurrency(normalizedAmount)} cho ${studentName}.`
          : `Đã rút ${formatCurrency(normalizedAmount)} khỏi tài khoản của ${studentName}.`,
      );
      onTransactionCommitted?.({
        type: mode,
        amount: normalizedAmount,
        deltaAmount,
        createdAt: new Date().toISOString(),
      });
      handleClose();
    } catch {
      // toast lỗi đã được xử lý trong onError
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]" aria-hidden onClick={handleClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-balance-popup-title"
        className="fixed inset-x-3 bottom-3 top-20 z-50 flex max-h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-[1.75rem] border border-border-default bg-bg-surface shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90vh] sm:w-[min(34rem,calc(100%-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2"
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
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${modeCopy.chipClass}`}>
                  {modeCopy.chipLabel}
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
                  type="number"
                  min={0}
                  step={1000}
                  inputMode="numeric"
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  placeholder="Ví dụ: 500000"
                  autoFocus
                />
              </label>

              {mode === "withdraw" && nextBalance < 0 && hasValidAmount ? (
                <p className="mt-3 rounded-xl border border-error/20 bg-error/10 px-3 py-2 text-sm text-error">
                  Sau giao dịch, tài khoản sẽ âm {formatCurrency(Math.abs(nextBalance))}.
                </p>
              ) : null}
            </section>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={balanceMutation.isPending}
              className="min-h-11 rounded-md border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={balanceMutation.isPending}
              className="min-h-11 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition hover:bg-[var(--ue-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60"
            >
              {balanceMutation.isPending ? "Đang lưu..." : modeCopy.submitLabel}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
