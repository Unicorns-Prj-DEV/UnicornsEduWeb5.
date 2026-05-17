"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";

export type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  minHeight?: string;
  placeholder?: string;
};

const DEFAULT_MIN_HEIGHT = "min-h-[180px]";

export default function RichTextEditor({
  value,
  onChange,
  minHeight = DEFAULT_MIN_HEIGHT,
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  const editor = useEditor({
    immediatelyRender: false,
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
      className={`rounded-md border border-border-default bg-bg-surface transition-colors focus-within:border-border-focus focus-within:ring-2 focus-within:ring-border-focus [&_.ProseMirror]:min-h-[160px] [&_.ProseMirror]:outline-none ${minHeight}`}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
