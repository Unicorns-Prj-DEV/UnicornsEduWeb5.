"use client";

import { CONTENT_LIMITS } from "@/dtos/content-limits";

/** Ô "Giới hạn ký tự" của câu tự luận (JP). Để trống = không giới hạn. */
export default function EssayMaxCharsField({
  id = "essay-max-chars",
  value,
  onChange,
}: {
  id?: string;
  /** Chuỗi ô nhập; "" = không giới hạn. */
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-medium text-text-muted"
      >
        Giới hạn ký tự (tuỳ chọn)
      </label>
      <div className="flex items-center gap-2">
        {/* type="text" + lọc chữ số: tránh bubble kiểm tra gốc của trình duyệt
            (tiếng Anh, lệch toast Sonner); số ngoài 1–max do payload báo toast. */}
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={String(CONTENT_LIMITS.essayMaxChars).length + 1}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          placeholder="Không giới hạn"
          className="min-h-11 w-full max-w-40 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        />
        <span className="text-sm text-text-muted">ký tự</span>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        Từ 1 đến {CONTENT_LIMITS.essayMaxChars}. Học sinh không gõ quá số ký tự
        này (có bộ đếm). Để trống = không giới hạn. Không ảnh hưởng chấm.
      </p>
    </div>
  );
}
