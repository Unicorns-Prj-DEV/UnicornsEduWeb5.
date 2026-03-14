"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useCallback } from "react";

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
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    editorProps: {
      attributes: {
        class: `px-3 py-2 text-text-primary [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_strong]:font-bold [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base ${minHeight}`,
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  const handleUpdate = useCallback(() => {
    const html = editor?.getHTML() ?? "";
    onChange(html);
  }, [editor, onChange]);

  useEffect(() => {
    if (!editor) return;
    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor, handleUpdate]);

  if (!editor) return null;

  return (
    <div
      className={`rounded-md border border-border-default bg-bg-surface transition-colors focus-within:border-border-focus focus-within:ring-2 focus-within:ring-border-focus [&_.ProseMirror]:min-h-[160px] [&_.ProseMirror]:outline-none ${minHeight}`}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
