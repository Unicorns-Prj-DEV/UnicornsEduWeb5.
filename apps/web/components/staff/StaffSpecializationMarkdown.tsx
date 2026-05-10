"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const PROSE =
  "prose prose-sm max-w-none break-words text-sm leading-relaxed text-text-primary [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-0 [&_p+p]:mt-2 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5";

export default function StaffSpecializationMarkdown({
  text,
  className,
  emptyFallback,
}: {
  text?: string | null;
  className?: string;
  /** Fallback shown when no specialization markdown is stored. */
  emptyFallback?: ReactNode;
}) {
  const markdownSource = (text ?? "").replace(/\r\n?/g, "\n").trim();
  const outer = className ? `${PROSE} ${className}` : PROSE;

  if (!markdownSource) {
    return (
      <p className="text-sm leading-relaxed text-text-muted">
        {emptyFallback ?? "Chưa có thành tích chuyên môn."}
      </p>
    );
  }

  return (
    <div className={outer}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
            >
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
