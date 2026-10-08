export enum QuestionTypeDto {
  single_choice = "single_choice",
  essay = "essay",
  /** Nhóm câu Đúng/Sai: 4 nhận định a–d nằm trong `options`, đáp án ở `tfAnswerKey` (chỉ hồ sơ IT). */
  true_false_group = "true_false_group",
}

/** Nhãn nhận định của câu Đúng/Sai. */
export const TRUE_FALSE_STATEMENT_LABELS = ["a", "b", "c", "d"] as const;

export interface Question {
  id: string;
  courseId: string;
  moduleId: string;
  difficultyLevelId: string;
  type: QuestionTypeDto;
  content: string;
  options: string[] | null;
  correctIndex: number | null;
  /** Đáp án 4 nhận định của câu Đúng/Sai (true = Đúng). Rỗng với loại khác. */
  tfAnswerKey: boolean[];
  explanation: string | null;
  answerGuide: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dữ liệu tối thiểu để đổ vào form soạn câu hỏi. Rộng hơn `Question` để nhận
 * được cả câu hỏi lấy từ `QuestionLink` (không kèm `createdAt`/`updatedAt`).
 */
export type QuestionFormInitial = Pick<
  Question,
  | "id"
  | "courseId"
  | "moduleId"
  | "difficultyLevelId"
  | "type"
  | "content"
  | "options"
  | "correctIndex"
  | "tfAnswerKey"
  | "explanation"
  | "answerGuide"
>;

export interface CreateQuestionInput {
  courseId: string;
  moduleId: string;
  difficultyLevelId: string;
  type: QuestionTypeDto;
  content: string;
  options?: string[];
  correctIndex?: number;
  tfAnswerKey?: boolean[];
  explanation?: string;
  answerGuide?: string;
}

export type UpdateQuestionInput = Partial<
  Omit<CreateQuestionInput, "courseId" | "moduleId" | "difficultyLevelId" | "type">
>;

export interface QuestionFilter {
  courseId?: string;
  moduleId?: string;
  difficultyLevelId?: string;
  type?: QuestionTypeDto;
  search?: string;
}

// --- AI Import types -------------------------------------------------------

/** Wizard steps in `AiImportModal`. */
export enum AiImportStep {
  prompt = "prompt",
  paste = "paste",
  review = "review",
}

/** Raw item from AI-generated JSON (difficulty is a name, not UUID) */
export interface AiQuestionItem {
  type: QuestionTypeDto;
  content: string;
  options?: string[];
  correctIndex?: number;
  tfAnswerKey?: boolean[];
  explanation?: string;
  answerGuide?: string;
  difficulty: string;
}

/** Validated item with resolved difficultyLevelId */
export interface ValidatedAiQuestion extends Omit<AiQuestionItem, "difficulty"> {
  difficultyLevelId: string;
  difficultyName: string;
  _valid: boolean;
  _errors: string[];
}

/** Payload sent to backend bulk create */
export interface BulkCreateQuestionInput {
  courseId: string;
  moduleId: string;
  questions: Array<{
    type: QuestionTypeDto;
    content: string;
    options?: string[];
    correctIndex?: number;
    tfAnswerKey?: boolean[];
    explanation?: string;
    answerGuide?: string;
    difficultyLevelId: string;
  }>;
}

export interface BulkCreateResponse {
  count: number;
  questions: Question[];
}

export const QUESTION_TYPE_LABELS: Record<QuestionTypeDto, string> = {
  [QuestionTypeDto.single_choice]: "Trắc nghiệm",
  [QuestionTypeDto.true_false_group]: "Đúng/Sai",
  [QuestionTypeDto.essay]: "Tự luận",
};

export function questionTypeLabel(type: QuestionTypeDto | string): string {
  return QUESTION_TYPE_LABELS[type as QuestionTypeDto] ?? type;
}
