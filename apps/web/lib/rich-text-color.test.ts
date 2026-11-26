// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  TextColor,
  activeTextColor,
  applyTextColor,
} from "@/components/ui/rich-text-extensions";

let editor: Editor | null = null;

function makeEditor(content: string) {
  editor = new Editor({ extensions: [StarterKit, TextColor], content });
  return editor;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe("TextColor mark", () => {
  it("giữ màu trong bảng màu khi nạp lại HTML", () => {
    const html = '<p><span data-text-color="blue">xanh</span></p>';
    expect(makeEditor(html).getHTML()).toBe(html);
  });

  it("bỏ mark có key lạ nhưng giữ chữ", () => {
    const html = makeEditor('<p><span data-text-color="url(x)">chữ</span></p>').getHTML();
    expect(html).toBe("<p>chữ</p>");
  });

  it("tô màu vùng chọn, đổi màu, rồi bỏ màu", () => {
    const ed = makeEditor("<p>abc</p>");
    ed.commands.setTextSelection({ from: 1, to: 4 });
    applyTextColor(ed, "red");
    expect(ed.getHTML()).toBe('<p><span data-text-color="red">abc</span></p>');
    expect(activeTextColor(ed)).toBe("red");

    applyTextColor(ed, "green");
    expect(ed.getHTML()).toBe('<p><span data-text-color="green">abc</span></p>');

    applyTextColor(ed, null);
    expect(ed.getHTML()).toBe("<p>abc</p>");
    expect(activeTextColor(ed)).toBeNull();
  });

  it("gạch chân có sẵn trong StarterKit", () => {
    const ed = makeEditor("<p>abc</p>");
    ed.commands.setTextSelection({ from: 1, to: 4 });
    ed.commands.toggleUnderline();
    expect(ed.getHTML()).toBe("<p><u>abc</u></p>");
  });
});
