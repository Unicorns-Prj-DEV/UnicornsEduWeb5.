import DOMPurify from "dompurify";

/**
 * Sanitizes HTML for safe display (e.g. rich text from TipTap).
 * Uses DOMPurify to strip scripts and dangerous attributes.
 * Call from client only; used by SessionHistoryTable and similar.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
