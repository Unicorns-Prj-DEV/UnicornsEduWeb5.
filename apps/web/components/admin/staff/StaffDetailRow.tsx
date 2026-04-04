"use client";

import { sanitizeRichTextContent } from "@/lib/sanitize";

export default function StaffDetailRow({
  label,
  value,
  richTextValue,
}: {
  label: string;
  value?: React.ReactNode;
  richTextValue?: string | null;
}) {
  const sanitizedRichTextValue =
    typeof richTextValue === "string" && richTextValue.trim()
      ? sanitizeRichTextContent(richTextValue)
      : "";

  const resolvedValue = sanitizedRichTextValue ? (
    <div
      className="prose prose-sm max-w-none text-sm leading-6 text-text-primary [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-0 [&_p+p]:mt-2 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
      dangerouslySetInnerHTML={{ __html: sanitizedRichTextValue }}
    />
  ) : (
    value
  );

  return (
    <div className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0 sm:flex-row sm:gap-4">
      <dt className="shrink-0 font-medium text-text-secondary sm:w-36">{label}</dt>
      <dd className="min-w-0 text-text-primary">{resolvedValue ?? "—"}</dd>
    </div>
  );
}
