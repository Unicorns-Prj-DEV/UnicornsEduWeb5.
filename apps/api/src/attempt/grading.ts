import { AttemptScoring, QuestionSlot, QuestionType } from 'generated/enums';

/**
 * Chấm Bài làm — hàm thuần, dùng chung cho nộp bài / hết giờ và chấm lại khi
 * sửa đáp án (ADR 2026-10-07-it-absolute-scoring-and-answer-key-regrade).
 * Chỉ đọc snapshot trên `attempt_answers`.
 */

/** Điểm câu trắc nghiệm hồ sơ IT: 0,25đ = 25 đơn vị 1/100 điểm. */
export const IT_SINGLE_CHOICE_POINTS = 25;
/** Điểm tối đa nhóm câu Đúng/Sai hồ sơ IT: 1đ. */
export const IT_TRUE_FALSE_POINTS = 100;
/** Bậc thang Đúng/Sai theo số nhận định đúng (index = số nhận định đúng). */
export const TRUE_FALSE_TIERS = [0, 10, 25, 50, 100] as const;

export type TrueFalseChoice = boolean | null;

export interface GradableAnswer {
  id: string;
  type: QuestionType;
  slot: QuestionSlot;
  pointsPossible: number;
  choiceIndex: number | null;
  correctIndex: number | null;
  tfChoices: unknown;
  tfAnswerKey: boolean[];
}

export interface AnswerGradePatch {
  id: string;
  isCorrect: boolean | null;
  pointsAwarded: number | null;
}

export interface AttemptGradeResult {
  patches: AnswerGradePatch[];
  autoGradedScore: number;
  autoGradedMax: number;
  hasUngradedEssay: boolean;
  electiveVoided: boolean;
}

/** Chuẩn hoá `tf_choices` (Json) thành mảng 4 phần tử `boolean | null`. */
export function normalizeTrueFalseChoices(raw: unknown): TrueFalseChoice[] {
  const list = Array.isArray(raw) ? raw : [];
  return Array.from({ length: 4 }, (_, i) =>
    typeof list[i] === 'boolean' ? (list[i] as boolean) : null,
  );
}

/** Số nhận định trả lời khớp đáp án. Bỏ trống không tính đúng. */
export function countCorrectStatements(
  key: boolean[],
  choices: TrueFalseChoice[],
): number {
  return key.reduce(
    (n, expected, i) =>
      choices[i] !== null && choices[i] === expected ? n + 1 : n,
    0,
  );
}

/** Có ít nhất một nhận định được chọn. */
export function hasAnyTrueFalseChoice(raw: unknown): boolean {
  return normalizeTrueFalseChoices(raw).some((c) => c !== null);
}

/**
 * Điểm nhóm câu Đúng/Sai theo bậc thang, quy về `pointsPossible` của câu.
 * IT (`pointsPossible = 100`): 0 / 10 / 25 / 50 / 100.
 */
export function gradeTrueFalse(
  key: boolean[],
  rawChoices: unknown,
  pointsPossible: number,
): { correct: number; points: number } {
  const correct = countCorrectStatements(
    key,
    normalizeTrueFalseChoices(rawChoices),
  );
  const tier = TRUE_FALSE_TIERS[Math.min(correct, 4)];
  return {
    correct,
    points: Math.round((tier * pointsPossible) / IT_TRUE_FALSE_POINTS),
  };
}

/**
 * Luật nhóm tự chọn: cả nhóm Tự chọn 1 và Tự chọn 2 đều có ≥1 nhận định được
 * chọn → phần tự chọn 0 điểm.
 */
export function isElectiveVoided(answers: GradableAnswer[]): boolean {
  const touched = (slot: QuestionSlot) =>
    answers.some((a) => a.slot === slot && hasAnyTrueFalseChoice(a.tfChoices));
  return touched(QuestionSlot.elective_1) && touched(QuestionSlot.elective_2);
}

export function gradeAnswers(
  answers: GradableAnswer[],
  scoring: AttemptScoring,
): AttemptGradeResult {
  const electiveVoided = isElectiveVoided(answers);
  let autoGradedScore = 0;
  let hasUngradedEssay = false;

  const patches = answers.map((ans): AnswerGradePatch => {
    if (ans.type === QuestionType.essay) {
      hasUngradedEssay = true;
      return { id: ans.id, isCorrect: null, pointsAwarded: null };
    }
    let isCorrect: boolean;
    let pointsAwarded: number;
    if (ans.type === QuestionType.true_false_group) {
      const graded = gradeTrueFalse(
        ans.tfAnswerKey,
        ans.tfChoices,
        ans.pointsPossible,
      );
      isCorrect = graded.correct === 4;
      pointsAwarded = graded.points;
    } else {
      isCorrect =
        ans.choiceIndex != null && ans.choiceIndex === ans.correctIndex;
      pointsAwarded = isCorrect ? ans.pointsPossible : 0;
    }
    if (electiveVoided && ans.slot !== QuestionSlot.required) {
      pointsAwarded = 0;
    }
    autoGradedScore += pointsAwarded;
    return { id: ans.id, isCorrect, pointsAwarded };
  });

  return {
    patches,
    autoGradedScore,
    autoGradedMax: autoGradedMaxOf(answers, scoring),
    hasUngradedEssay,
    electiveVoided,
  };
}

/**
 * Điểm tối đa phần tự chấm. Câu tự luận không tính (chấm tay).
 * Nhóm tự chọn chỉ tính một nhóm (học sinh chỉ được làm một nhóm).
 */
export function autoGradedMaxOf(
  answers: Pick<GradableAnswer, 'type' | 'slot' | 'pointsPossible'>[],
  scoring: AttemptScoring,
): number {
  const sumOf = (filter: (a: (typeof answers)[number]) => boolean) =>
    answers
      .filter((a) => a.type !== QuestionType.essay && filter(a))
      .reduce((sum, a) => sum + a.pointsPossible, 0);
  const required = sumOf((a) => a.slot === QuestionSlot.required);
  if (scoring !== AttemptScoring.absolute_it) {
    return sumOf(() => true);
  }
  const e1 = sumOf((a) => a.slot === QuestionSlot.elective_1);
  const e2 = sumOf((a) => a.slot === QuestionSlot.elective_2);
  return required + Math.max(e1, e2);
}
