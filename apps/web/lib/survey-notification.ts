/**
 * Build the plain-text "THÔNG BÁO KHẢO SÁT" message (same style as the Zalo
 * announcement template) from structured survey notification fields, so it
 * can be copied and pasted directly into a Zalo group.
 */
export interface SurveyNotificationFields {
  title: string | null | undefined;
  startDate: string | null | undefined;
  endDate: string | null | undefined;
  content: string | null | undefined;
  instructions: string | null | undefined;
  notes: string | null | undefined;
  teacherNote: string | null | undefined;
}

function formatShortDate(value: string | null | undefined): string {
  if (!value) return "";
  const [, month, day] = value.slice(0, 10).split("-");
  if (!month || !day) return value;
  return `${day}/${month}`;
}

export function buildSurveyZaloMessage(fields: SurveyNotificationFields): string {
  const lines: string[] = [];

  if (fields.title?.trim()) {
    lines.push(`📢 ${fields.title.trim()}`);
  }

  const start = formatShortDate(fields.startDate);
  const end = formatShortDate(fields.endDate);
  if (start || end) {
    lines.push(`⏰ Thời gian: ${start}${start && end ? " → " : ""}${end}`);
  }

  if (fields.content?.trim()) {
    lines.push("📌 Nội dung:", fields.content.trim(), "");
  }

  if (fields.instructions?.trim()) {
    lines.push("📝 Hướng dẫn:", fields.instructions.trim(), "");
  }

  if (fields.notes?.trim()) {
    lines.push("⚠️ Lưu ý:", fields.notes.trim(), "");
  }

  if (fields.teacherNote?.trim()) {
    lines.push("📅 Gia sư:", fields.teacherNote.trim(), "");
  }

  return lines.join("\n").trim();
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}
