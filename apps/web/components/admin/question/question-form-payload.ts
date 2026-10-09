import { QuestionTypeDto } from "@/dtos/question.dto";
import { assertNever } from "@/lib/assert-never";
import type { QuestionFormInitial } from "@/dtos/question.dto";
import type { QuestionFormValue } from "@/components/admin/question/QuestionFormFields";

export type QuestionFormPayload = {
  moduleId: string;
  difficultyLevelId: string;
  type: QuestionTypeDto;
  content: string;
  options?: string[];
  correctIndex?: number;
  tfAnswerKey?: boolean[];
  explanation?: string;
  answerGuide?: string;
};

function isBlankHtml(html: string): boolean {
  if (/data-latex=|<img|<table|<pre/i.test(html)) return false;
  return (
    html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim() === ""
  );
}

/**
 * Kiểm tra + chuyển giá trị form soạn câu thành payload API. Mỗi loại câu chỉ
 * gửi trường của loại đó (API từ chối trộn: trắc nghiệm có `tfAnswerKey`…).
 */
export function questionFormToPayload(form: QuestionFormValue): PayloadResult {
  if (!form.moduleId || !form.difficultyLevelId || isBlankHtml(form.content)) {
    return { error: "Điền chuyên đề, mức khó và nội dung câu hỏi" };
  }
  const base = {
    moduleId: form.moduleId,
    difficultyLevelId: form.difficultyLevelId,
    type: form.type,
    content: form.content.trim(),
    explanation: isBlankHtml(form.explanation)
      ? undefined
      : form.explanation.trim(),
  };

  switch (form.type) {
    case QuestionTypeDto.single_choice:
      return singleChoicePayload(base, form);
    case QuestionTypeDto.true_false_group:
      return trueFalseGroupPayload(base, form);
    case QuestionTypeDto.essay:
      return {
        payload: {
          ...base,
          answerGuide: isBlankHtml(form.answerGuide)
            ? undefined
            : form.answerGuide.trim(),
        },
      };
    default:
      return assertNever(form.type, "question type");
  }
}

type PayloadBase = Pick<
  QuestionFormPayload,
  "moduleId" | "difficultyLevelId" | "type" | "content" | "explanation"
>;
type PayloadResult = { payload: QuestionFormPayload } | { error: string };

function singleChoicePayload(
  base: PayloadBase,
  form: QuestionFormValue,
): PayloadResult {
  const options = form.options.map((o) => o.trim());
  if (options.some((o) => !o)) {
    return { error: "Phương án không được để trống" };
  }
  if (options.length < 2 || options.length > 6) {
    return { error: "Trắc nghiệm cần 2–6 phương án" };
  }
  if (form.correctIndex < 0 || form.correctIndex >= options.length) {
    return { error: "Đáp án đúng không hợp lệ" };
  }
  return { payload: { ...base, options, correctIndex: form.correctIndex } };
}

function trueFalseGroupPayload(
  base: PayloadBase,
  form: QuestionFormValue,
): PayloadResult {
  if (form.statements.some(isBlankHtml)) {
    return { error: "Điền đủ 4 nhận định a–d" };
  }
  return {
    payload: {
      ...base,
      options: form.statements.map((s) => s.trim()),
      tfAnswerKey: [...form.tfAnswerKey],
    },
  };
}

/** Phần form phụ thuộc loại câu, dựng từ câu có sẵn (sửa) hoặc mặc định (tạo). */
export function questionToFormParts(
  question: Pick<
    QuestionFormInitial,
    "type" | "options" | "correctIndex" | "tfAnswerKey"
  > | null,
): Pick<
  QuestionFormValue,
  "options" | "correctIndex" | "statements" | "tfAnswerKey"
> {
  const isTf = question?.type === QuestionTypeDto.true_false_group;
  const opts = question?.options ?? [];
  return {
    options: !isTf && opts.length ? opts : ["", "", "", ""],
    correctIndex: question?.correctIndex ?? 0,
    statements: isTf
      ? [0, 1, 2, 3].map((i) => opts[i] ?? "")
      : ["", "", "", ""],
    tfAnswerKey:
      isTf && question?.tfAnswerKey?.length === 4
        ? [...question.tfAnswerKey]
        : [true, true, true, true],
  };
}
