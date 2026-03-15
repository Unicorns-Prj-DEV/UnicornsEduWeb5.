"use client";

import RichTextEditor from "@/components/ui/RichTextEditor";

type Props = {
  value: string;
  onChange: (html: string) => void;
  minHeight?: string;
};

export default function NotesSubjectRichEditor({
  value,
  onChange,
  minHeight = "min-h-[180px]",
}: Props) {
  return <RichTextEditor value={value} onChange={onChange} minHeight={minHeight} />;
}
