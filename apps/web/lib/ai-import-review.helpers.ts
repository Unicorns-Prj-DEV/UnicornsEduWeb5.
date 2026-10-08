import {
  QuestionTypeDto,
  type ValidatedAiQuestion,
} from "@/dtos/question.dto";

const ALLOWED_FIELDS = new Set([
  "type",
  "content",
  "options",
  "correctIndex",
  "tfAnswerKey",
  "explanation",
  "answerGuide",
  "difficulty",
]);

const MAX_AI_IMPORT_QUESTIONS = 50;

/** Loại câu mặc định khi chưa biết hồ sơ môn (JP/ENG cũ). */
export const DEFAULT_AI_QUESTION_TYPES: readonly QuestionTypeDto[] = [
  QuestionTypeDto.single_choice,
  QuestionTypeDto.essay,
];

export interface AiJsonValidateResult {
  items: ValidatedAiQuestion[];
  parseError: string | null;
}

export function validateAiJson(
  raw: string,
  difficultyNames: string[],
  allowedTypes: readonly QuestionTypeDto[] = DEFAULT_AI_QUESTION_TYPES,
): AiJsonValidateResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      items: [],
      parseError: "JSON không hợp lệ. Vui lòng kiểm tra lại.",
    };
  }

  if (!Array.isArray(parsed)) {
    return { items: [], parseError: "Kết quả phải là một JSON array." };
  }

  if (parsed.length === 0) {
    return { items: [], parseError: "JSON array trống." };
  }

  if (parsed.length > MAX_AI_IMPORT_QUESTIONS) {
    return {
      items: [],
      parseError: `Quá nhiều câu hỏi (${parsed.length}). Tối đa ${MAX_AI_IMPORT_QUESTIONS} câu một lần.`,
    };
  }

  const items = (parsed as Record<string, unknown>[]).map((obj) =>
    validateAiQuestionRecord(obj, difficultyNames, {
      checkUnknownFields: true,
      allowedTypes,
    }),
  );

  return { items, parseError: null };
}

export function revalidateAiQuestion(
  next: ValidatedAiQuestion,
  difficultyNames: string[],
  allowedTypes: readonly QuestionTypeDto[] = DEFAULT_AI_QUESTION_TYPES,
): ValidatedAiQuestion {
  const record: Record<string, unknown> = {
    type: next.type,
    content: next.content,
    difficulty: next.difficultyName,
  };
  if (next.options !== undefined) record.options = next.options;
  if (next.correctIndex !== undefined) record.correctIndex = next.correctIndex;
  if (next.tfAnswerKey !== undefined) record.tfAnswerKey = next.tfAnswerKey;
  if (next.explanation !== undefined) record.explanation = next.explanation;
  if (next.answerGuide !== undefined) record.answerGuide = next.answerGuide;

  const validated = validateAiQuestionRecord(record, difficultyNames, {
    checkUnknownFields: false,
    allowedTypes,
  });

  return {
    ...validated,
    difficultyLevelId: next.difficultyLevelId,
    difficultyName: next.difficultyName,
    _valid: validated._valid && !!next.difficultyLevelId,
    _errors: next.difficultyLevelId
      ? validated._errors
      : [...validated._errors, "Độ khó chưa được gắn với mức của khoá"],
  };
}

export function formatQuestionErrors(
  index: number,
  errors: string[],
): string {
  const prefix = `Câu ${index + 1}`;
  if (errors.length === 0) return prefix;
  return `${prefix}: ${errors.join("; ")}`;
}

export function summarizeInvalidQuestions(
  items: ValidatedAiQuestion[],
  maxLines = 5,
): string[] {
  const lines: string[] = [];
  items.forEach((item, index) => {
    if (item._valid || item._errors.length === 0) return;
    lines.push(formatQuestionErrors(index, item._errors));
  });
  if (lines.length > maxLines) {
    const extra = lines.length - maxLines;
    return [...lines.slice(0, maxLines), `… và ${extra} câu lỗi khác`];
  }
  return lines;
}

export function remapReviewedAfterRemove(
  reviewed: ReadonlySet<number>,
  removedIndex: number,
): Set<number> {
  const next = new Set<number>();
  for (const index of reviewed) {
    if (index < removedIndex) next.add(index);
    else if (index > removedIndex) next.add(index - 1);
  }
  return next;
}

export function unreviewedCount(
  total: number,
  reviewed: ReadonlySet<number>,
): number {
  if (total <= 0) return 0;
  let viewed = 0;
  for (let i = 0; i < total; i++) {
    if (reviewed.has(i)) viewed += 1;
  }
  return total - viewed;
}

export function allQuestionsReviewed(
  total: number,
  reviewed: ReadonlySet<number>,
): boolean {
  return total > 0 && unreviewedCount(total, reviewed) === 0;
}

export function remainingReviewLabel(remaining: number): string {
  if (remaining <= 0) return "";
  return `Còn ${remaining} câu chưa review`;
}

export function importDisabledReason(input: {
  remainingUnreviewed: number;
  moduleId: string;
  validCount: number;
  isPending: boolean;
}): string | null {
  if (input.isPending) return "Đang lưu…";
  if (input.remainingUnreviewed > 0) {
    return remainingReviewLabel(input.remainingUnreviewed);
  }
  if (!input.moduleId) return "Chọn chuyên đề trước khi lưu";
  if (input.validCount <= 0) return "Không có câu hợp lệ để lưu";
  return null;
}

function validateAiQuestionRecord(
  obj: Record<string, unknown>,
  difficultyNames: string[],
  options: {
    checkUnknownFields: boolean;
    allowedTypes: readonly QuestionTypeDto[];
  },
): ValidatedAiQuestion {
  const errors: string[] = [];

  if (options.checkUnknownFields) {
    for (const key of Object.keys(obj)) {
      if (!ALLOWED_FIELDS.has(key)) {
        errors.push(`Trường không cho phép: "${key}"`);
      }
    }
  }

  const type = obj.type;
  if (!options.allowedTypes.includes(type as QuestionTypeDto)) {
    errors.push(
      `type phải là ${options.allowedTypes.map((t) => `"${t}"`).join(" hoặc ")}`,
    );
  }

  const content = obj.content;
  if (typeof content !== "string" || !content.trim()) {
    errors.push("content là bắt buộc và không được rỗng");
  }

  const difficulty = obj.difficulty;
  const difficultyName = typeof difficulty === "string" ? difficulty : "";
  const matchedLevel = difficultyNames.find(
    (name) => name.trim() === difficultyName.trim(),
  );

  if (!difficultyName) {
    errors.push("difficulty là bắt buộc");
  } else if (!matchedLevel) {
    errors.push(
      `difficulty "${difficultyName}" không khớp với danh sách độ khó của khoá`,
    );
  }

  if (type === QuestionTypeDto.single_choice) {
    const optionList = obj.options;
    if (
      !Array.isArray(optionList) ||
      optionList.length < 2 ||
      optionList.length > 6
    ) {
      errors.push("options: cần 2–6 phương án cho single_choice");
    } else {
      for (let j = 0; j < optionList.length; j++) {
        if (typeof optionList[j] !== "string" || !optionList[j].trim()) {
          errors.push(`options[${j}]: không được rỗng`);
        }
      }
    }

    const correctIndex = obj.correctIndex;
    if (typeof correctIndex !== "number" || !Number.isInteger(correctIndex)) {
      errors.push("correctIndex phải là số nguyên");
    } else if (
      Array.isArray(optionList) &&
      (correctIndex < 0 || correctIndex >= optionList.length)
    ) {
      errors.push(
        `correctIndex ${correctIndex} nằm ngoài phạm vi [0, ${optionList.length - 1}]`,
      );
    }
  }

  if (type === QuestionTypeDto.true_false_group) {
    const statements = obj.options;
    if (!Array.isArray(statements) || statements.length !== 4) {
      errors.push("options: câu Đúng/Sai cần đúng 4 nhận định a–d");
    } else {
      statements.forEach((st, j) => {
        if (typeof st !== "string" || !st.trim()) {
          errors.push(`options[${j}]: nhận định không được rỗng`);
        }
      });
    }
    const key = obj.tfAnswerKey;
    if (
      !Array.isArray(key) ||
      key.length !== 4 ||
      key.some((k) => typeof k !== "boolean")
    ) {
      errors.push("tfAnswerKey phải là mảng 4 giá trị true/false");
    }
    if (obj.correctIndex !== undefined) {
      errors.push("Đúng/Sai không được có correctIndex");
    }
  } else if (obj.tfAnswerKey !== undefined) {
    errors.push("Chỉ câu Đúng/Sai mới có tfAnswerKey");
  }

  if (type === QuestionTypeDto.essay) {
    if (obj.options !== undefined) {
      errors.push("essay không được có options");
    }
    if (obj.correctIndex !== undefined) {
      errors.push("essay không được có correctIndex");
    }
  }

  return {
    type: Object.values(QuestionTypeDto).includes(type as QuestionTypeDto)
      ? (type as QuestionTypeDto)
      : QuestionTypeDto.single_choice,
    content: typeof content === "string" ? content : "",
    options: Array.isArray(obj.options) ? (obj.options as string[]) : undefined,
    correctIndex:
      typeof obj.correctIndex === "number" ? obj.correctIndex : undefined,
    tfAnswerKey: Array.isArray(obj.tfAnswerKey)
      ? (obj.tfAnswerKey as boolean[])
      : undefined,
    explanation:
      typeof obj.explanation === "string" ? obj.explanation : undefined,
    answerGuide:
      typeof obj.answerGuide === "string" ? obj.answerGuide : undefined,
    difficultyLevelId: "",
    difficultyName,
    _valid: errors.length === 0 && !!matchedLevel,
    _errors: errors,
  };
}
