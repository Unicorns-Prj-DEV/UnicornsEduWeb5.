/**
 * Màu chữ trong rich text (câu hỏi, bài học). Lưu thành
 * `<span data-text-color="red">` chứ không dùng `style="color:…"`: sanitizer
 * (`lib/rich-html.ts`) cố ý chặn `style`, và bảng màu cố định thì tự đổi sắc
 * theo theme sáng/tối. Màu thật nằm ở 2 nơi — thêm/bớt màu phải sửa cả hai:
 * - Web: `--ue-text-color-*` trong `app/globals.css` (có bản dark).
 * - Đề in PDF: `EXAM_CSS` trong `apps/api/src/exam-print/exam-print-html.ts`.
 */
export const TEXT_COLOR_ATTR = "data-text-color";

export const TEXT_COLORS = [
  { key: "red", label: "Đỏ" },
  { key: "blue", label: "Xanh dương" },
  { key: "green", label: "Xanh lá" },
  { key: "orange", label: "Cam" },
  { key: "purple", label: "Tím" },
] as const;

export type TextColorKey = (typeof TEXT_COLORS)[number]["key"];

const TEXT_COLOR_KEYS: ReadonlySet<string> = new Set(TEXT_COLORS.map((c) => c.key));

export function isTextColorKey(value: unknown): value is TextColorKey {
  return typeof value === "string" && TEXT_COLOR_KEYS.has(value);
}

/** CSS var của màu (dùng cho ô chọn màu trên toolbar). */
export function textColorVar(key: TextColorKey): string {
  return `var(--ue-text-color-${key})`;
}
