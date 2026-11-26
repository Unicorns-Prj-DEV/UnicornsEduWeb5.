import { Mark, Node, mergeAttributes, type Editor, type JSONContent } from "@tiptap/react";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import {
  TEXT_COLOR_ATTR,
  isTextColorKey,
  type TextColorKey,
} from "@/dtos/rich-text-color.dto";

/**
 * Hai khối code đặt cạnh nhau (đề Tin: cùng thuật toán viết Python | C++).
 * Lưu thành `<div data-code-parallel>` chứa đúng 2 `<pre><code>`; màn hình hẹp
 * xếp chồng (CSS `.rich-content [data-code-parallel]`).
 */
export const CodeParallel = Node.create({
  name: "codeParallel",
  group: "block",
  content: "codeBlock codeBlock",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: "div[data-code-parallel]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-code-parallel": "" }), 0];
  },
});

export const CODE_PARALLEL_TEMPLATE: JSONContent = {
  type: "codeParallel",
  content: [
    { type: "codeBlock", attrs: { language: "python" } },
    { type: "codeBlock", attrs: { language: "cpp" } },
  ],
};

const CODE_CONTAINERS = new Set(["codeBlock", "codeParallel"]);

/**
 * Con trỏ đang trong khối code (chỉ chứa text) thì chèn bảng/ảnh/code song song
 * sẽ tách khối code và làm mất `language`. Tạo đoạn trống ngay sau khối code
 * ngoài cùng rồi đặt con trỏ vào đó; ngoài khối code thì giữ nguyên.
 */
export function leaveCodeBlock(editor: Editor) {
  editor
    .chain()
    .focus()
    .command(({ tr, state }) => {
      const $pos = tr.selection.$from;
      let outer = -1;
      for (let depth = 1; depth <= $pos.depth; depth++) {
        if (CODE_CONTAINERS.has($pos.node(depth).type.name)) {
          outer = depth;
          break;
        }
      }
      if (outer < 0) return true;
      const after = $pos.after(outer);
      tr.insert(after, state.schema.nodes.paragraph.create());
      tr.setSelection(TextSelection.create(tr.doc, after + 1));
      return true;
    })
    .run();
}

/**
 * Chuẩn bị chèn khối (bảng, ảnh, code song song): thoát khối code, và nếu con
 * trỏ đang ở paragraph trống cấp 1 thì chọn cả paragraph để khối mới thay chỗ
 * nó — tránh để sót dòng trống phía trên.
 */
export function prepareBlockInsert(editor: Editor) {
  leaveCodeBlock(editor);
  editor
    .chain()
    .command(({ tr }) => {
      const { $from, empty } = tr.selection;
      if (!empty || $from.depth !== 1) return true;
      const { parent } = $from;
      if (parent.type.name !== "paragraph" || parent.content.size > 0) return true;
      tr.setSelection(NodeSelection.create(tr.doc, $from.before(1)));
      return true;
    })
    .run();
}

/** Chèn khối code song song rồi đặt con trỏ vào khối Python (khối đầu). */
export function insertCodeParallel(editor: Editor) {
  prepareBlockInsert(editor);
  editor
    .chain()
    .focus()
    .insertContent(CODE_PARALLEL_TEMPLATE)
    .command(({ tr }) => {
      const $pos = tr.selection.$from;
      for (let depth = $pos.depth; depth > 0; depth--) {
        if ($pos.node(depth).type.name === "codeParallel") {
          tr.setSelection(TextSelection.create(tr.doc, $pos.start(depth) + 1));
          break;
        }
      }
      return true;
    })
    .run();
}

/**
 * Ảnh: URL https hoặc ảnh trong bucket private (`data-question-image` = path;
 * `src` là signed URL API ký mỗi lần trả, API bỏ `src` khi lưu). Ảnh bucket
 * có thể về không `src` (storage lỗi) — vẫn giữ node để không mất path.
 */
export const QUESTION_IMAGE_ATTR = "data-question-image";

const RichImage = Image.extend({
  parseHTML() {
    return [
      { tag: 'img[src]:not([src^="data:"])' },
      { tag: `img[${QUESTION_IMAGE_ATTR}]` },
    ];
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      imagePath: {
        default: null,
        parseHTML: (el) => el.getAttribute(QUESTION_IMAGE_ATTR),
        renderHTML: (attrs) =>
          attrs.imagePath ? { [QUESTION_IMAGE_ATTR]: attrs.imagePath } : {},
      },
    };
  },
});

/**
 * Màu chữ theo bảng cố định: `<span data-text-color="red">` (xem
 * `dtos/rich-text-color.dto.ts`). Key lạ (dán từ nơi khác, sửa tay) bị bỏ
 * mark, giữ chữ — không để lọt giá trị mà CSS không tô được.
 */
export const TextColor = Mark.create({
  name: "textColor",

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (el) => el.getAttribute(TEXT_COLOR_ATTR),
        renderHTML: (attrs) => ({ [TEXT_COLOR_ATTR]: attrs.color }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `span[${TEXT_COLOR_ATTR}]`,
        getAttrs: (el) => (isTextColorKey(el.getAttribute(TEXT_COLOR_ATTR)) ? null : false),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
});

/** Màu đang áp tại vùng chọn / con trỏ; null = màu mặc định. */
export function activeTextColor(editor: Editor): TextColorKey | null {
  const color: unknown = editor.getAttributes(TextColor.name).color;
  return isTextColorKey(color) ? color : null;
}

/** `null` = bỏ màu (về màu chữ mặc định của theme). */
export function applyTextColor(editor: Editor, color: TextColorKey | null) {
  const chain = editor.chain().focus();
  if (color) chain.setMark(TextColor.name, { color });
  else chain.unsetMark(TextColor.name);
  chain.run();
}

/** Bảng, ảnh, code song song, màu chữ — ghép thêm sau StarterKit + Mathematics. */
export const RICH_TEXT_EXTENSIONS = [
  TableKit.configure({ table: { resizable: false } }),
  RichImage.configure({ inline: false, allowBase64: false }),
  CodeParallel,
  TextColor,
];

/** Chỉ nhận ảnh qua http(s); chặn `javascript:`/`data:`. */
export function normalizeImageUrl(raw: string): string | null {
  const value = raw.trim();
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
