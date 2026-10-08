export type AttemptStatusDto = "in_progress" | "submitted" | "timed_out";

/** Thang điểm của Bài làm: `equal_100` = 100/N (JP/ENG), `absolute_it` = điểm tuyệt đối 0,25 / 1 (IT). */
export type AttemptScoringDto = "equal_100" | "absolute_it";

/** Vị trí câu trong đề: Bắt buộc / Tự chọn 1 / Tự chọn 2. */
export type QuestionSlotDto = "required" | "elective_1" | "elective_2";

/** Lựa chọn 4 nhận định a–d: true = Đúng, false = Sai, null = chưa chọn. */
export type TrueFalseChoices = (boolean | null)[];

export interface AttemptQuestionDto {
  questionId: string;
  order: number;
  /**
   * Thang điểm câu lúc start. `equal_100`: 100/N. `absolute_it`: đơn vị 1/100 điểm
   * (trắc nghiệm 25, Đúng/Sai 100).
   */
  pointsPossible: number;
  type: "single_choice" | "essay" | "true_false_group";
  slot: QuestionSlotDto;
  content: string;
  options: string[] | null;
  choiceIndex: number | null;
  essayAnswer: string | null;
  tfChoices: TrueFalseChoices | null;
  markedForReview: boolean;
  correctIndex?: number | null;
  tfAnswerKey?: boolean[];
  isCorrect?: boolean | null;
  pointsAwarded?: number | null;
  explanation?: string | null;
  answerGuide?: string | null;
}

export interface AttemptDetailDto {
  id: string;
  assignmentId: string;
  classId: string;
  title: string;
  status: AttemptStatusDto;
  startedAt: string;
  durationMinutes: number;
  endsAt: string;
  remainingMs: number;
  submittedAt: string | null;
  autoGradedScore: number | null;
  autoGradedMax: number | null;
  /** Tổng điểm tối đa. `equal_100`: 100. `absolute_it`: câu bắt buộc + một nhóm tự chọn (đơn vị 1/100). */
  scoreMax: number;
  hasUngradedEssay: boolean;
  scoring: AttemptScoringDto;
  /** Học sinh làm cả hai nhóm tự chọn → phần tự chọn 0 điểm. */
  electiveVoided: boolean;
  electiveGroupNames: { elective_1: string | null; elective_2: string | null };
  /** Hạn lần giao = mở bài + thời lượng (null = không có hạn). */
  closeAt: string | null;
  /** false = đã nộp nhưng chưa tới hạn: API ẩn điểm và đáp án. */
  resultsReleased: boolean;
  questions: AttemptQuestionDto[];
}

export interface AttemptSummaryDto {
  id: string;
  status: AttemptStatusDto;
  startedAt: string;
  submittedAt: string | null;
  autoGradedScore: number | null;
  autoGradedMax: number | null;
  hasUngradedEssay: boolean;
  scoring: AttemptScoringDto;
}

export interface AssignmentLobbyDto {
  assignmentId: string;
  classId: string;
  lessonId: string;
  title: string;
  durationMinutes: number;
  openAt: string | null;
  /** Hạn lần giao = mở bài + thời lượng (null = không có hạn). */
  closeAt: string | null;
  /** Đã tới hạn: không bắt đầu lượt mới; trước hạn điểm các lượt là null. */
  closed: boolean;
  attempts: AttemptSummaryDto[];
}

export interface SaveAttemptAnswersPayload {
  answers: Array<{
    questionId: string;
    choiceIndex?: number | null;
    essayAnswer?: string | null;
    tfChoices?: TrueFalseChoices | null;
    markedForReview?: boolean;
  }>;
}
