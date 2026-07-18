import { formatCurrency } from "@/lib/class.helpers";

type ClassStudentWalletBalanceProps = {
  balance?: number | null;
  className?: string;
};

/**
 * Renders class-roster wallet balance when present.
 * Missing/non-finite values render nothing (CSKH redaction → empty cell).
 */
export default function ClassStudentWalletBalance({
  balance,
  className,
}: ClassStudentWalletBalanceProps) {
  if (typeof balance !== "number" || !Number.isFinite(balance)) {
    return null;
  }

  const tone =
    balance < 0
      ? "text-error"
      : balance > 0
        ? "text-success"
        : "text-text-primary";

  return (
    <span
      className={`font-medium tabular-nums ${tone}${className ? ` ${className}` : ""}`}
    >
      {formatCurrency(balance)}
    </span>
  );
}
