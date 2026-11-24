"use client";

import { cn } from "@/lib/utils";
import { CONTENT_LIMITS } from "@/dtos/content-limits";

/**
 * Ô trả lời câu tự luận. `maxChars` (JP) = giới hạn ký tự gia sư đặt: chặn gõ quá
 * bằng `maxLength` + hiện bộ đếm `n/max` (server cũng chặn, đếm cùng kiểu
 * `String.length`). `size` là kiểu ô cũ: `short` = một dòng (Enter không tạo dòng
 * mới), `long`/null = nhiều dòng. Chỉ là giao diện — không ảnh hưởng chấm.
 */
export default function EssayAnswerInput({
  value,
  size,
  maxChars,
  disabled,
  rows = 5,
  className,
  onChange,
}: {
  value: string | null | undefined;
  size: "short" | "long" | null | undefined;
  /** Giới hạn ký tự; null/undefined = không giới hạn. */
  maxChars?: number | null;
  disabled?: boolean;
  /** Số dòng của ô dài. */
  rows?: number;
  className?: string;
  onChange: (essayAnswer: string) => void;
}) {
  const short = size === "short";
  const text = value ?? "";
  const limit = maxChars ?? null;
  const cap = limit ?? CONTENT_LIMITS.essayAnswer;
  const nearLimit = limit !== null && text.length >= limit * 0.9;
  return (
    <div>
      <textarea
        value={text}
        disabled={disabled}
        maxLength={limit ?? undefined}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Bộ gõ tiếng Nhật dùng Enter để chốt chữ — chỉ chặn khi không đang soạn.
          if (short && e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
          }
        }}
        aria-label="Nhập câu trả lời"
        placeholder={
          limit !== null
            ? `Nhập câu trả lời (tối đa ${limit} ký tự)...`
            : "Nhập câu trả lời..."
        }
        rows={short ? 1 : rows}
        aria-invalid={text.length > cap}
        className={cn(
          "w-full border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
          short && "field-sizing-content min-h-11 resize-none",
          className,
        )}
      />
      {limit !== null ? (
        <p
          className={cn(
            "mt-1 text-right text-xs tabular-nums",
            text.length > limit
              ? "text-error"
              : nearLimit
                ? "text-warning"
                : "text-text-muted",
          )}
          aria-live="polite"
        >
          {text.length}/{limit} ký tự
        </p>
      ) : null}
    </div>
  );
}
