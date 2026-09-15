import { parseMoneyInput } from "@/lib/money-input.helpers";

export const fixedSalaryInputClassName =
  "min-h-11 w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary tabular-nums focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10";

export function getFixedSalaryApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  const message = (
    error as { response?: { data?: { message?: string | string[] } } }
  )?.response?.data?.message;

  if (Array.isArray(message) && message.length > 0) {
    return message.join(", ");
  }

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

export function formatFixedSalaryVnd(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

/** Empty → null (use role default). `0` is kept as an intentional exclusion. */
export function parseOptionalFixedSalaryAmountInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (/-/.test(trimmed)) {
    throw new Error("Số tiền lương cứng không được âm.");
  }

  const parsed = parseMoneyInput(trimmed);
  if (parsed == null || parsed < 0) {
    throw new Error("Số tiền lương cứng không hợp lệ.");
  }

  return parsed;
}

/** Empty → null (use role default). `0` is kept as an intentional 0%. */
export function parseOptionalFixedSalaryOperatingRateInput(
  raw: string,
): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const numericValue = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 100) {
    throw new Error("% khấu trừ vận hành lương cứng phải nằm trong khoảng 0–100.");
  }

  return Number(numericValue.toFixed(2));
}
