"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { isLikelyHtmlFragment, sanitizeRichTextContent } from "@/lib/sanitize";
import { normalizeInlineHyphenBulletsForMarkdown } from "@/lib/staff-specialization-markdown";

const PROSE =
  "prose prose-sm max-w-none text-sm leading-relaxed text-text-primary [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-0 [&_p+p]:mt-2 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5";

export default function StaffSpecializationRichText({
  text,
  className,
  emptyFallback,
}: {
  text?: string | null;
  className?: string;
  /** Khi không có nội dung (mặc định copy cho khối “Thành tích chuyên môn”) */
  emptyFallback?: ReactNode;
}) {
  const normalized = (text ?? "").replace(/\r\n?/g, "\n");
  const trimmed = normalized.trim();
  const outer = className ? `${PROSE} ${className}` : PROSE;

  if (!trimmed) {
    return (
      <p className="text-sm leading-relaxed text-text-muted">
        {emptyFallback ?? "Chưa có thành tích chuyên môn."}
      </p>
    );
  }

  if (isLikelyHtmlFragment(trimmed)) {
    const html = sanitizeRichTextContent(trimmed);
    if (!html) {
      return (
        <p className="text-sm leading-relaxed text-text-muted">
          {emptyFallback ?? "Chưa có thành tích chuyên môn."}
        </p>
      );
    }
    return (
      <div
        className={outer}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const markdownSource = normalizeInlineHyphenBulletsForMarkdown(trimmed);

  return (
    <div className={outer}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {markdownSource}
      </ReactMarkdown>
    </div>
  );
}
