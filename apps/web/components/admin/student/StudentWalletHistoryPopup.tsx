"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/class.helpers";

type WalletTxType = "topup" | "withdraw";

export type StudentWalletTx = {
  id: string;
  type: WalletTxType;
  amount: number;
  createdAt: string;
  note?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  studentId: string;
  studentName?: string;
};

const STORAGE_PREFIX = "ue.student.walletHistory.";

function readTxs(studentId: string): StudentWalletTx[] {
  if (!studentId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${studentId}`);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as StudentWalletTx[]) : [];
  } catch {
    return [];
  }
}

export function appendStudentWalletTx(studentId: string, tx: StudentWalletTx) {
  if (!studentId) return;
  try {
    const current = readTxs(studentId);
    const next = [tx, ...current].slice(0, 200);
    localStorage.setItem(`${STORAGE_PREFIX}${studentId}`, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function txLabel(type: WalletTxType): string {
  return type === "topup" ? "Nạp tiền" : "Rút tiền";
}

function txChipClass(type: WalletTxType): string {
  return type === "topup"
    ? "bg-primary/10 text-primary ring-primary/20"
    : "bg-warning/15 text-text-primary ring-warning/20";
}

export default function StudentWalletHistoryPopup({ open, onClose, studentId, studentName }: Props) {
  const [txs, setTxs] = useState<StudentWalletTx[]>([]);

  useEffect(() => {
    if (!open) return;
    setTxs(readTxs(studentId));
  }, [open, studentId]);

  const title = useMemo(() => studentName?.trim() || "Học sinh", [studentName]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
        aria-hidden
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 p-2 sm:p-4">
        <div className="mx-auto flex h-full w-full items-center max-w-2xl">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-wallet-history-title"
            className="flex max-h-full w-full flex-col overflow-hidden rounded-[1.25rem] border border-border-default bg-bg-surface p-4 shadow-2xl sm:p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-border-default/70 pb-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                  Wallet History
                </p>
                <h2 id="student-wallet-history-title" className="mt-1 truncate text-lg font-semibold text-text-primary">
                  Lịch sử giao dịch
                </h2>
                <p className="mt-1 text-sm text-text-secondary">{title}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                aria-label="Đóng"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1 sm:pr-2">
              {txs.length === 0 ? (
                <div className="rounded-xl border border-border-default bg-bg-secondary/40 px-4 py-6 text-center">
                  <p className="text-sm font-medium text-text-primary">Chưa có giao dịch.</p>
                  <p className="mt-1 text-sm text-text-muted">
                    Khi bạn nạp/rút tiền, hệ thống sẽ lưu lịch sử (FE-only) để theo dõi nhanh.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {txs.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-border-default bg-bg-surface px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${txChipClass(tx.type)}`}>
                            {txLabel(tx.type)}
                          </span>
                          <span className="text-xs text-text-muted">{formatDateTime(tx.createdAt)}</span>
                        </div>
                        {tx.note?.trim() ? (
                          <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{tx.note.trim()}</p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums text-text-primary">
                          {tx.type === "withdraw" ? "-" : "+"}
                          {formatCurrency(tx.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end border-t border-border-default pt-4">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

