/**
 * Nhiều hồ sơ lưu thành tích một dòng: "… năm 2024. - Mục tiếp" hoặc "Tiêu đề:- Mục".
 * remark-gfm cần xuống dòng trước `- ` mới tạo <ul>. Hàm này chèn \n\n trước các bullet đó.
 */
export function normalizeInlineHyphenBulletsForMarkdown(input: string): string {
  let s = input.replace(/\r\n?/g, "\n").trim();
  if (!s) return s;

  // **Thành tích cá nhân:** - mục đầu (colon nằm trong cụm **…:**)
  s = s.replace(/\*\*([^*]+):\*\*\s+-\s+/g, "**$1:**\n\n- ");

  // **Tiêu đề** ngoài, colon sau sao: **X**:\s+-\s+
  s = s.replace(/\*\*([^*]+)\*\*:\s+-\s+/g, "**$1:**\n\n- ");

  // Dấu chấm / hai chấm rồi (khoảng trắng) rồi gạch ngang bullet
  s = s.replace(/([\.\:])(\s*)-\s+/g, "$1\n\n- ");

  return s;
}
