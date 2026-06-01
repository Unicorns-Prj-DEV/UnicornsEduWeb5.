"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useMemo, useRef } from "react";
import { sanitizeRichTextContent } from "@/lib/sanitize";

export type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  minHeight?: string;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
};

const DEFAULT_MIN_HEIGHT = "min-h-[180px]";

export default function RichTextEditor({
  value,
  onChange,
  minHeight = DEFAULT_MIN_HEIGHT,
  ariaLabel = "Nội dung soạn thảo",
  disabled = false,
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  const editorContent = useMemo(
    () => sanitizeRichTextContent(value),
    [value],
  );
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: editorContent,
    editorProps: {
      attributes: {
        class: `px-3 py-2 text-text-primary [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_strong]:font-bold [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base ${minHeight}`,
        "aria-label": ariaLabel,
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (editorContent !== current) editor.commands.setContent(editorContent, { emitUpdate: false });
  }, [editorContent, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => {
      onChangeRef.current(editor.getHTML());
    };
    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      className={`rounded-md border border-border-default transition-colors ${
        disabled
          ? "bg-bg-secondary/60 text-text-secondary cursor-not-allowed opacity-75"
          : "bg-bg-surface focus-within:border-border-focus focus-within:ring-2 focus-within:ring-border-focus"
      } [&_.ProseMirror]:outline-none ${minHeight}`}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
