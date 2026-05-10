import DOMPurify from "dompurify";

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;
const HTML_ESCAPE_TABLE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    return HTML_ESCAPE_TABLE[character] ?? character;
  });
}

/**
 * Sanitizes HTML for safe display (e.g. rich text from TipTap).
 * Uses DOMPurify to strip scripts and dangerous attributes.
 * Call from client only; used by SessionHistoryTable and similar.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

/**
 * Accepts plain text or rich text HTML and returns sanitized HTML for display.
 * Plain text keeps line breaks by converting newlines into <br>.
 */
export function sanitizeRichTextContent(content: string): string {
  const normalizedContent = content.trim().replace(/\r\n?/g, "\n");

  if (!normalizedContent) {
    return "";
  }

  const html = HTML_TAG_PATTERN.test(normalizedContent)
    ? normalizedContent
    : escapeHtml(normalizedContent).replace(/\n/g, "<br />");

  return sanitizeHtml(html);
}
