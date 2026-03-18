import StudentDetailRow from "./StudentDetailRow";
import StudentInfoCard from "./StudentInfoCard";
import { formatCurrency } from "@/lib/class.helpers";

type Props = {
  balance: number;
  className?: string;
  onTopUp: () => void;
  onWithdraw: () => void;
  onOpenHistory?: () => void;
};

export default function StudentWalletCard({
  balance,
  className = "",
  onTopUp,
  onWithdraw,
  onOpenHistory,
}: Props) {
  const isNegativeBalance = balance < 0;
  const amountClass = isNegativeBalance ? "text-error" : "text-text-primary";

  return (
    <StudentInfoCard title="Tài khoản hiện tại" className={className}>
      <div className="relative">
        <dl>
          <StudentDetailRow
            label="Số dư"
            value={
              <span className={`text-base font-semibold tabular-nums sm:text-lg ${amountClass}`}>
                {formatCurrency(balance)}
              </span>
            }
          />
        </dl>

        {onOpenHistory ? (
          <button
            type="button"
            onClick={onOpenHistory}
            className="absolute right-0 top-0 inline-flex size-9 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-muted transition hover:bg-bg-tertiary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:size-8"
            aria-label="Xem lịch sử giao dịch"
            title="Lịch sử giao dịch"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2m12 0H5m12 0a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2m3 6h.01M12 15h.01M16 15h.01"
              />
            </svg>
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onTopUp}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition-transform transition-colors duration-200 hover:-translate-y-0.5 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
          </svg>
          Nạp tiền
        </button>
        <button
          type="button"
          onClick={onWithdraw}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-transform transition-colors duration-200 hover:-translate-y-0.5 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H8m0 0 5-5m-5 5 5 5" />
          </svg>
          Rút tiền
        </button>
      </div>
    </StudentInfoCard>
  );
}
