/**
 * Tutorial CF được lưu từ TipTap dạng HTML (<p>, <br>, …).
 * react-markdown không render HTML thô → thẻ như <p> hiện literal trong UI.
 * Hàm này bóc HTML → chuỗi markdown-like (đoạn cách bằng \\n\\n) rồi mới qua remark-math + KaTeX.
 */

const BLOCK_TAGS = new Set([
  "p",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "li",
  "tr",
]);

function htmlToPlainFallback(html: string): string {
  return html
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?p[^>]*>/gi, "\n")
    .replace(/<\/?div[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function nodeToMarkdownish(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (tag === "br") return "\n";

  if (tag === "ul" || tag === "ol") {
    const items = Array.from(el.children).flatMap((child) => {
      if (child.tagName.toLowerCase() !== "li") return [];
      const text = nodeToMarkdownish(child).trim();
      return text ? [`- ${text}`] : [];
    });
    return items.length ? `${items.join("\n")}\n\n` : "";
  }

  if (tag === "li") {
    return Array.from(el.childNodes).map(nodeToMarkdownish).join("");
  }

  const inner = Array.from(el.childNodes).map(nodeToMarkdownish).join("");

  if (BLOCK_TAGS.has(tag)) {
    const t = inner.trim();
    return t ? `${t}\n\n` : "";
  }

  return inner;
}

/**
 * @param raw Nội dung từ DB: HTML TipTap hoặc markdown thuần đã lưu trước đó.
 */
export function tutorialStoredContentToMarkdownSource(raw: string): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return "";

  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(trimmed);
  if (!looksLikeHtml) return trimmed;

  if (typeof document === "undefined") {
    return htmlToPlainFallback(trimmed);
  }

  try {
    const doc = new DOMParser().parseFromString(trimmed, "text/html");
    const out = Array.from(doc.body.childNodes).map(nodeToMarkdownish).join("");
    return out.replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    return htmlToPlainFallback(trimmed);
  }
}
