import { QuestionType } from 'generated/enums';

/**
 * Đảo câu / đảo đáp án lúc `start` (CONTEXT.md — Đảo câu). Mỗi lượt xáo một lần,
 * kết quả nằm trong snapshot `attempt_answers` nên F5 không đổi thứ tự.
 */
export type Rng = () => number;

/** Fisher–Yates: hoán vị ngẫu nhiên đều của `0..n-1`. */
export function shuffledIndices(n: number, rng: Rng = Math.random): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * Xáo trong từng đoạn liên tiếp cùng nhóm, giữ nguyên thứ tự các nhóm. Đầu vào
 * phải đã sắp theo nhóm (vd `orderExamLinks`).
 */
export function shuffleWithinGroups<T>(
  items: T[],
  groupOf: (item: T) => string | number,
  rng: Rng = Math.random,
): T[] {
  const out: T[] = [];
  let start = 0;
  while (start < items.length) {
    const key = groupOf(items[start]);
    let end = start + 1;
    while (end < items.length && groupOf(items[end]) === key) end++;
    const run = items.slice(start, end);
    out.push(...shuffledIndices(run.length, rng).map((i) => run[i]));
    start = end;
  }
  return out;
}

const NOT_LETTER = '(?<![\\p{L}\\p{N}])';
const END = '(?![\\p{L}\\p{N}])';

/**
 * Đáp án / nhận định nhắc tới vị trí của phương án khác: đảo sẽ sai nghĩa. Thà
 * bắt nhầm (câu đó chỉ không đảo đáp án) còn hơn sót (đáp án sai nghĩa).
 */
const POSITION_DEPENDENT: RegExp[] = [
  /(ở|nêu|kể|liệt kê)\s+(bên\s+)?trên/iu,
  /trên\s+đây|dưới\s+đây/iu,
  /tất\s+cả\s+(các\s+)?(đáp\s+án|phương\s+án|ý|nhận\s+định|lựa\s+chọn)|tất\s+cả\s+đều/iu,
  /không\s+(có\s+)?(đáp\s+án|phương\s+án|ý|lựa\s+chọn)\s+nào/iu,
  /cả\s+(hai|ba|bốn)\s+(đáp\s+án|phương\s+án|ý|nhận\s+định|đều)/iu,
  new RegExp(`${NOT_LETTER}(cả|đáp\\s+án|phương\\s+án)\\s+[A-D]${END}`, 'iu'),
  new RegExp(`${NOT_LETTER}[A-D]\\s*(,|và|hoặc|and|or)\\s*[A-D]${END}`, 'u'),
  new RegExp(`${NOT_LETTER}(ý|nhận\\s+định|mệnh\\s+đề)\\s+[a-d]${END}`, 'iu'),
  /\b(all|none|both|neither)\s+of\s+(the\s+)?(above|these)\b/i,
];

function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

export function isPositionDependent(options: string[]): boolean {
  return options.some((opt) => {
    const text = plainText(opt);
    return POSITION_DEPENDENT.some((re) => re.test(text));
  });
}

export interface AnswerKey {
  correctIndex: number | null;
  tfAnswerKey: boolean[];
}

/** Đổi đáp án thứ tự gốc sang thứ tự hiển thị. `optionOrder[i]` = chỉ số gốc của phương án hiển thị thứ i. */
export function remapAnswerKey(
  optionOrder: number[],
  key: Partial<AnswerKey>,
): Partial<AnswerKey> {
  if (optionOrder.length === 0) return key;
  const out: Partial<AnswerKey> = {};
  if (key.correctIndex !== undefined) {
    // Phương án đúng mới không có trong snapshot (gia sư thêm phương án sau khi
    // lượt bắt đầu) → null: không ai đúng, xem lại không hiện đáp án rác.
    const pos =
      key.correctIndex === null ? -1 : optionOrder.indexOf(key.correctIndex);
    out.correctIndex = pos < 0 ? null : pos;
  }
  if (key.tfAnswerKey !== undefined) {
    out.tfAnswerKey =
      key.tfAnswerKey.length === optionOrder.length
        ? optionOrder.map((i) => key.tfAnswerKey![i])
        : key.tfAnswerKey;
  }
  return out;
}

export interface ShuffledOptions extends AnswerKey {
  options: string[];
  optionOrder: number[];
}

/**
 * Xáo phương án (trắc nghiệm) hoặc nhận định (Đúng/Sai). `null` = giữ nguyên:
 * tự luận, dữ liệu lạ, hoặc có phương án phụ thuộc vị trí.
 */
export function shuffleQuestionOptions(
  question: {
    type: QuestionType;
    options: unknown;
    correctIndex: number | null;
    tfAnswerKey: boolean[];
  },
  rng: Rng = Math.random,
): ShuffledOptions | null {
  if (question.type === QuestionType.essay) return null;
  const options = question.options;
  if (
    !Array.isArray(options) ||
    options.length < 2 ||
    !options.every((o): o is string => typeof o === 'string')
  ) {
    return null;
  }
  if (isPositionDependent(options)) return null;
  const optionOrder = shuffledIndices(options.length, rng);
  const key = remapAnswerKey(optionOrder, {
    correctIndex: question.correctIndex,
    tfAnswerKey: question.tfAnswerKey,
  });
  return {
    options: optionOrder.map((i) => options[i]),
    optionOrder,
    correctIndex: key.correctIndex ?? null,
    tfAnswerKey: key.tfAnswerKey ?? [],
  };
}
