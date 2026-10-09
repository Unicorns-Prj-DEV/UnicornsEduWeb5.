export enum QuestionTypeDto {
  single_choice = "single_choice",
  essay = "essay",
  /** Nhóm câu Đúng/Sai: 4 nhận định a–d nằm trong `options`, đáp án ở `tfAnswerKey` (chỉ hồ sơ IT). */
  true_false_group = "true_false_group",
  /** Câu Đúng/Sai (chỉ hồ sơ JP): một nhận định ở `content`, đáp án `tfAnswerKey: [boolean]`. */
  true_false = "true_false",
}

/** Kiểu nhãn Câu Đúng/Sai (JP), chọn theo từng câu. null = ○/×. */
export type TrueFalseLabelStyleDto = "maru_batsu" | "dung_sai" | "true_false";

export const DEFAULT_TRUE_FALSE_LABEL_STYLE: TrueFalseLabelStyleDto = "maru_batsu";

/** Nhãn hai lựa chọn [Đúng, Sai] theo kiểu nhãn. */
export const TRUE_FALSE_CHOICE_LABELS: Record<
  TrueFalseLabelStyleDto,
  readonly [string, string]
> = {
  maru_batsu: ["○", "×"],
  dung_sai: ["Đúng", "Sai"],
  true_false: ["True", "False"],
};

export function trueFalseChoiceLabels(
  style: TrueFalseLabelStyleDto | null | undefined,
): readonly [string, string] {
  return TRUE_FALSE_CHOICE_LABELS[style ?? DEFAULT_TRUE_FALSE_LABEL_STYLE];
}

/** Kỹ năng câu hỏi (chỉ hồ sơ JP), thứ tự hiển thị cố định. */
export enum QuestionSkillDto {
  kanji = "kanji",
  vocabulary = "vocabulary",
  grammar = "grammar",
  reading = "reading",
  listening = "listening",
  conversation = "conversation",
  writing = "writing",
}

export const QUESTION_SKILL_LABELS: Record<QuestionSkillDto, string> = {
  [QuestionSkillDto.kanji]: "Kanji",
  [QuestionSkillDto.vocabulary]: "Từ vựng",
  [QuestionSkillDto.grammar]: "Ngữ pháp",
  [QuestionSkillDto.reading]: "Đọc hiểu",
  [QuestionSkillDto.listening]: "Nghe hiểu",
  [QuestionSkillDto.conversation]: "Hội thoại",
  [QuestionSkillDto.writing]: "Viết câu",
};

/** Kiểu ô nhập câu tự luận (JP). null = ô dài (câu cũ / hồ sơ khác). */
export type EssayInputSizeDto = "short" | "long";

export const ESSAY_INPUT_SIZE_LABELS: Record<EssayInputSizeDto, string> = {
  short: "Ô ngắn (một dòng)",
  long: "Ô dài (nhiều dòng)",
};

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
  /** Kỹ năng (JP); rỗng với hồ sơ khác hoặc câu JP cũ. */
  skills: QuestionSkillDto[];
  /** Kiểu ô tự luận (JP); null = ô dài. */
  essayInputSize: EssayInputSizeDto | null;
  /** Kiểu nhãn Câu Đúng/Sai (JP); null = ○/×. */
  tfLabelStyle: TrueFalseLabelStyleDto | null;
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
> &
  Partial<Pick<Question, "skills" | "essayInputSize" | "tfLabelStyle">>;

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
  skills?: QuestionSkillDto[];
  essayInputSize?: EssayInputSizeDto | null;
  tfLabelStyle?: TrueFalseLabelStyleDto | null;
}

export type UpdateQuestionInput = Partial<
  Omit<CreateQuestionInput, "courseId" | "moduleId" | "difficultyLevelId" | "type">
>;

export interface QuestionFilter {
  courseId?: string;
  moduleId?: string;
  difficultyLevelId?: string;
  type?: QuestionTypeDto;
  skill?: QuestionSkillDto;
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
  [QuestionTypeDto.true_false]: "Đúng/Sai",
  [QuestionTypeDto.essay]: "Tự luận",
};

export function questionTypeLabel(type: QuestionTypeDto | string): string {
  return QUESTION_TYPE_LABELS[type as QuestionTypeDto] ?? type;
}
