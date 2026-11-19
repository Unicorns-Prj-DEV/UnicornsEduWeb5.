import { BLANK_MARKER } from "@/dtos/question.dto";

/** Nối thêm `text` vào cuối nội dung (trong đoạn cuối nếu là HTML). */
export function appendInlineText(html: string, text: string): string {
  const trimmed = html.trimEnd();
  if (trimmed.endsWith("</p>")) {
    return `${trimmed.slice(0, -"</p>".length)} ${text}</p>`;
  }
  return trimmed ? `${trimmed} ${text}` : `<p>${text}</p>`;
}

/** Nối thêm một ô `[[___]]` vào cuối đề (trong đoạn cuối nếu đề là HTML). */
export function appendBlankMarker(html: string): string {
  return appendInlineText(html, BLANK_MARKER);
}

/**
 * Đổi các ô `[[___]]` trong đề thành nhãn số thứ tự `【1】`, `【2】`… để học
 * sinh khớp với ô nhập bên dưới. Nhãn là chữ thường — chạy được với cả đề HTML
 * lẫn Markdown (không dùng `_` vì Markdown hiểu là in nghiêng).
 */
export function numberBlanks(content: string): string {
  let n = 0;
  return content.split(BLANK_MARKER).reduce((acc, part, i) => {
    if (i === 0) return part;
    n += 1;
    return `${acc}【${n}】${part}`;
  }, "");
}

/** Cắt/đệm danh sách đáp án từng ô cho khớp số ô trong đề. */
export function resizeBlankKey(key: string[][], count: number): string[][] {
  return Array.from({ length: count }, (_, i) => key[i] ?? [""]);
}

/**
 * Đáp án sau khi chèn một ô mới ở vị trí `index` (0 = trước mọi ô cũ): ô mới
 * nhận đáp án trống, đáp án các ô phía sau dời theo — đáp án gắn với ô theo
 * thứ tự xuất hiện trong đề, chèn giữa mà không dời thì lệch hết.
 */
export function insertBlankAnswerSlot(
  key: string[][],
  count: number,
  index: number,
): string[][] {
  const next = resizeBlankKey(key, count);
  next.splice(Math.min(Math.max(index, 0), count), 0, [""]);
  return next;
}

/**
 * Con trỏ ở `offset` rơi vào giữa một dấu `[[…]]` (ô trống, vị trí trống) thì
 * trả offset ngay sau dấu — chèn giữa dấu làm hỏng cả hai. Không thì giữ nguyên.
 */
export function offsetPastMarker(text: string, offset: number): number {
  if (offset <= 0) return offset;
  const open = text.lastIndexOf("[[", offset - 1);
  if (open < 0) return offset;
  const close = text.indexOf("]]", open + 2);
  if (close < 0 || offset >= close + 2) return offset;
  return close + 2;
}

/** Chuẩn hoá giống API (`normalizeBlankAnswer`) — chỉ để tô xanh/đỏ khi xem lại. */
function normalizeBlankAnswer(raw: string): string {
  return raw
    .trim()
    .replace(/[０-９Ａ-Ｚａ-ｚ]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0),
    )
    .toLowerCase();
}

/** Chữ học sinh gõ trùng một đáp án hợp lệ của ô (ô bỏ trống = sai). */
export function isBlankAnswerAccepted(
  answer: string | null | undefined,
  accepted: string[],
): boolean {
  if (!answer?.trim()) return false;
  const given = normalizeBlankAnswer(answer);
  return accepted.some((a) => normalizeBlankAnswer(a) === given);
}

/** Đúng mọi ô (khớp `isCorrect` của API). */
export function allBlanksAccepted(
  answers: (string | null)[] | null | undefined,
  key: string[][] | null | undefined,
): boolean {
  return (
    !!key?.length &&
    key.every((accepted, i) => isBlankAnswerAccepted(answers?.[i], accepted))
  );
}
