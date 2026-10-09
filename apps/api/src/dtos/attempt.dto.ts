import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CONTENT_LIMITS } from './content-limits';

@ValidatorConstraint({ name: 'trueFalseChoice' })
class TrueFalseChoiceConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return value === null || typeof value === 'boolean';
  }

  defaultMessage(): string {
    return 'tfChoices chỉ nhận true, false hoặc null';
  }
}

@ValidatorConstraint({ name: 'blankAnswer' })
export class BlankAnswerConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return value === null || (typeof value === 'string' && value.length <= 200);
  }

  defaultMessage(): string {
    return 'blankAnswers chỉ nhận chuỗi ≤ 200 ký tự hoặc null';
  }
}

export type AttemptScoringDto = 'equal_100' | 'absolute_it';
export type QuestionSlotDto = 'required' | 'elective_1' | 'elective_2';

export class GradeEssayAnswerDto {
  @ApiProperty({
    description:
      'Điểm chấm cho câu tự luận này (0..pointsPossible snapshot = 100/N)',
  })
  @IsInt()
  @Min(0)
  pointsAwarded: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Nhận xét của gia sư cho học sinh về câu này',
    maxLength: CONTENT_LIMITS.feedback,
  })
  @IsOptional()
  @IsString()
  @MaxLength(CONTENT_LIMITS.feedback)
  feedback?: string | null;
}

/** Một câu tự luận đang chờ chấm trong hàng đợi (thuộc lượt làm mới nhất của học sinh). */
export interface EssayGradingQueueItemDto {
  attemptAnswerId: string;
  attemptId: string;
  studentId: string;
  studentName: string;
  /** Tổng số lượt học sinh đã làm cho lần giao này (để hiển thị banner "làm N lượt"). */
  studentAttemptCount: number;
  /** Mốc thời gian lượt mới nhất (submittedAt, fallback startedAt). */
  attemptSubmittedAt: Date;
  /** Vị trí câu trong đề (1-based) để hiển thị "Câu N/Total". */
  questionOrder: number;
  totalQuestions: number;
  questionContent: string;
  /** Tên mức độ khó của câu (CourseDifficultyLevel.name). */
  difficultyLabel: string;
  pointsPossible: number;
  answerGuide: string | null;
  essayAnswer: string | null;
}

export interface EssayGradingQueueDto {
  classId: string;
  assignmentId: string;
  title: string;
  totalPending: number;
  items: EssayGradingQueueItemDto[];
}

export class SaveAttemptAnswerItemDto {
  @ApiProperty({ description: 'Question id' })
  @IsString()
  questionId: string;

  @ApiPropertyOptional({ nullable: true, description: 'MCQ choice index' })
  @IsOptional()
  @IsInt()
  @Min(0)
  choiceIndex?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Essay text',
    maxLength: CONTENT_LIMITS.essayAnswer,
  })
  @IsOptional()
  @IsString()
  @MaxLength(CONTENT_LIMITS.essayAnswer)
  essayAnswer?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: [Boolean],
    description:
      'Lựa chọn Đúng/Sai: true (Đúng) / false (Sai) / null (bỏ trống). Nhóm câu Đúng/Sai 4 phần tử; Câu Đúng/Sai (JP) 1 phần tử.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @Validate(TrueFalseChoiceConstraint, { each: true })
  tfChoices?: (boolean | null)[] | null;

  @ApiPropertyOptional({
    nullable: true,
    type: [String],
    description:
      'Câu điền vào ô trống (JP): chữ học sinh gõ vào từng ô theo thứ tự; null/rỗng = bỏ trống.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @Validate(BlankAnswerConstraint, { each: true })
  blankAnswers?: (string | null)[] | null;

  @ApiPropertyOptional({
    nullable: true,
    type: [String],
    description:
      'Câu sắp xếp (JP): chữ thẻ theo thứ tự học sinh xếp; [] = chưa xếp.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  orderAnswer?: string[] | null;

  @ApiPropertyOptional({
    description: 'Học sinh đánh dấu quay lại xem trước nộp',
  })
  @IsOptional()
  @IsBoolean()
  markedForReview?: boolean;
}

export class SaveAttemptAnswersDto {
  @ApiProperty({ type: [SaveAttemptAnswerItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveAttemptAnswerItemDto)
  answers: SaveAttemptAnswerItemDto[];
}

/**
 * Audio trong lượt làm. Đang làm + có giới hạn lượt nghe: `url` = null, xin URL
 * qua `POST .../audio/:audioId/play` (mỗi lần xin trừ một lượt). Đã nộp: URL
 * thẳng, không giới hạn, được tua.
 */
export interface AttemptAudioView {
  id: string;
  url: string | null;
  /** null = không giới hạn. */
  maxPlays: number | null;
  allowSeek: boolean;
  playsUsed: number;
}

/** Kết quả bấm phát audio giới hạn. */
export interface AttemptAudioPlayDto {
  url: string | null;
  maxPlays: number | null;
  playsUsed: number;
}

export interface AttemptQuestionDto {
  questionId: string;
  order: number;
  /** `equal_100`: 100/N (Hamilton). `absolute_it`: 25 / 100, đơn vị 1/100 điểm. */
  pointsPossible: number;
  type:
    | 'single_choice'
    | 'essay'
    | 'true_false_group'
    | 'true_false'
    | 'fill_blank'
    | 'ordering';
  /** Vị trí câu: Bắt buộc / Tự chọn 1 / Tự chọn 2. */
  slot: QuestionSlotDto;
  content: string;
  /** single_choice: phương án; true_false_group: 4 nhận định a–d; ordering: thẻ đã xáo. */
  options: string[] | null;
  /** Kiểu ô tự luận (snapshot): short = một dòng, long/null = nhiều dòng. */
  essayInputSize: 'short' | 'long' | null;
  /** Kiểu nhãn Câu Đúng/Sai (snapshot): maru_batsu (○/×, mặc định khi null) / dung_sai / true_false. */
  tfLabelStyle: 'maru_batsu' | 'dung_sai' | 'true_false' | null;
  choiceIndex: number | null;
  /** Lựa chọn 4 nhận định (Đúng/Sai/trống); null với loại khác. */
  tfChoices: (boolean | null)[] | null;
  /** Đáp án 4 nhận định — chỉ khi đã nộp. */
  tfAnswerKey?: boolean[] | null;
  /** Câu điền vào ô trống: số ô; null với loại khác. */
  blankCount: number | null;
  /** Chữ học sinh gõ từng ô (độ dài = blankCount); null với loại khác. */
  blankAnswers: (string | null)[] | null;
  /** Đáp án hợp lệ từng ô — chỉ khi đã nộp. */
  blankAnswerKey?: string[][] | null;
  /** Câu sắp xếp: chữ thẻ theo thứ tự học sinh xếp; null với loại khác. */
  orderAnswer: string[] | null;
  /** Câu sắp xếp: thứ tự đúng — chỉ khi đã nộp. */
  orderingKey?: string[] | null;
  /**
   * Tư liệu dùng chung (bản chụp lúc start). Các câu cùng `id` đứng liền nhau —
   * web hiện nội dung một lần trước câu đầu của khối.
   */
  sharedMaterial: {
    id: string;
    content: string;
    /** Audio của tư liệu; null = không có. */
    audio: AttemptAudioView | null;
  } | null;
  /** Audio nhúng của câu; null = không có. */
  audio: AttemptAudioView | null;
  essayAnswer: string | null;
  markedForReview: boolean;
  correctIndex?: number | null;
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
  status: 'in_progress' | 'submitted' | 'timed_out';
  startedAt: Date;
  durationMinutes: number;
  endsAt: Date;
  remainingMs: number;
  submittedAt: Date | null;
  autoGradedScore: number | null;
  autoGradedMax: number | null;
  /** Tổng điểm tối đa của bài (`equal_100` = 100; `absolute_it` = tổng câu bắt buộc + một nhóm tự chọn). */
  scoreMax: number;
  hasUngradedEssay: boolean;
  scoring: AttemptScoringDto;
  /** Làm cả hai nhóm tự chọn → phần tự chọn 0 điểm. */
  electiveVoided: boolean;
  /** Tên hai nhóm tự chọn (null nếu chưa đặt). */
  electiveGroupNames: { elective_1: string | null; elective_2: string | null };
  /** Hạn lần giao = `openAt + durationMinutes` (null = lần giao cũ không có hạn). */
  closeAt: Date | null;
  /**
   * false = đã nộp nhưng chưa tới hạn: điểm (`autoGradedScore`/`autoGradedMax`),
   * `electiveVoided` và đáp án từng câu bị ẩn.
   */
  resultsReleased: boolean;
  questions: AttemptQuestionDto[];
}

export interface AttemptSummaryDto {
  id: string;
  status: 'in_progress' | 'submitted' | 'timed_out';
  startedAt: Date;
  submittedAt: Date | null;
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
  openAt: Date | null;
  /** Hạn lần giao = `openAt + durationMinutes` (null = không có hạn). */
  closeAt: Date | null;
  /** Đã tới hạn: không bắt đầu lượt mới, điểm các lượt được công bố. */
  closed: boolean;
  /** Điểm trong `attempts` là null khi chưa tới hạn. */
  attempts: AttemptSummaryDto[];
}

/** Trạng thái hàng học sinh trên bảng thống kê lần giao (Màn 12). */
export type PracticeStatsStudentStatus =
  | 'graded'
  | 'pending_essay'
  | 'not_started';

export interface PracticeStatsQuestionRateDto {
  questionId: string;
  /** Vị trí câu trong đề (1-based). */
  order: number;
  type:
    | 'single_choice'
    | 'essay'
    | 'true_false_group'
    | 'true_false'
    | 'fill_blank'
    | 'ordering';
  correctCount: number;
  /** Số học sinh có lượt tốt nhất đã chấm xong chứa câu này. */
  sampleCount: number;
  /** 0..1 — chỉ trên lượt tốt nhất đã chấm xong. */
  correctRate: number;
}

export interface PracticeStatsStudentRowDto {
  studentId: string;
  studentName: string;
  /** Tổng điểm lượt cao nhất đã chấm xong (đơn vị theo `scoring`); null nếu chưa có lượt đó. */
  score: number | null;
  /** Điểm tối đa của lượt đó. */
  scoreMax: number | null;
  /** Số lượt đã nộp (submitted / timed_out), không tính in_progress. */
  attemptCount: number;
  /** Thời gian làm của lượt dùng để hiện điểm (hoặc lượt nộp mới nhất nếu chờ chấm). */
  durationMs: number | null;
  status: PracticeStatsStudentStatus;
}

export interface PracticeStatsDto {
  classId: string;
  assignmentId: string;
  title: string;
  className: string;
  openAt: Date | null;
  durationMinutes: number | null;
  submittedCount: number;
  rosterCount: number;
  /** Trung bình điểm các học sinh đã chấm xong (đơn vị theo `scoring`); null nếu chưa ai. */
  averageScore: number | null;
  /** Thang điểm để hiển thị: `absolute_it` thì điểm hiển thị = giá trị / 100. */
  scoring: AttemptScoringDto;
  /** Điểm tối đa của đề (lượt chấm xong gần nhất); null nếu chưa ai làm. */
  scoreMax: number | null;
  pendingEssayCount: number;
  questions: PracticeStatsQuestionRateDto[];
  students: PracticeStatsStudentRowDto[];
}
