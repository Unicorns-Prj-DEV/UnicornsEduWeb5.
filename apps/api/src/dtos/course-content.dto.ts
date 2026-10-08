import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { LessonKind } from 'generated/enums';
import { CONTENT_LIMITS, HTTP_URL_OPTIONS } from './content-limits';

/** Product cap for practice lần giao duration (12 hours). Matches FE + schema docs. */
export const PRACTICE_DURATION_MIN_MINUTES = 1;
export const PRACTICE_DURATION_MAX_MINUTES = 720;

export class LessonCreateDto {
  @ApiProperty({
    description: 'Loại tiết học: lý thuyết hoặc thực hành',
    enum: LessonKind,
    example: LessonKind.theory,
  })
  @IsEnum(LessonKind)
  kind: LessonKind;

  @ApiPropertyOptional({
    description: 'ID khoá học (bắt buộc khi tiết thuộc chuyên đề cấp khoá)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  courseId?: string | null;

  @ApiPropertyOptional({
    description: 'ID chuyên đề (bắt buộc khi tiết thuộc khoá học)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  moduleId?: string | null;

  @ApiPropertyOptional({
    description:
      'ID lớp học (bắt buộc khi tiết riêng lớp; loại trừ courseId+moduleId)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  classId?: string | null;

  @ApiProperty({
    description: 'Tiêu đề tiết học',
    example: 'Ma trận và định thức',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description:
      'Link video YouTube nhúng. Chỉ tiết lý thuyết; tiết thực hành bị từ chối.',
    nullable: true,
    maxLength: CONTENT_LIMITS.url,
  })
  @IsOptional()
  @ValidateIf((_, value) => typeof value === 'string' && value.trim() !== '')
  @IsUrl(HTTP_URL_OPTIONS)
  @MaxLength(CONTENT_LIMITS.url)
  videoUrl?: string | null;

  @ApiPropertyOptional({
    description:
      'Nội dung tiết lý thuyết (HTML rich text). Tiết thực hành bị từ chối.',
    nullable: true,
    maxLength: CONTENT_LIMITS.theoryContent,
  })
  @IsOptional()
  @IsString()
  @MaxLength(CONTENT_LIMITS.theoryContent)
  content?: string | null;
}

export class LessonUpdateDto {
  @ApiPropertyOptional({ description: 'Tiêu đề tiết học' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Link video YouTube nhúng. Tiết thực hành bị từ chối.',
    nullable: true,
    maxLength: CONTENT_LIMITS.url,
  })
  @IsOptional()
  @ValidateIf((_, value) => typeof value === 'string' && value.trim() !== '')
  @IsUrl(HTTP_URL_OPTIONS)
  @MaxLength(CONTENT_LIMITS.url)
  videoUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Nội dung tiết lý thuyết (HTML). Tiết thực hành bị từ chối.',
    nullable: true,
    maxLength: CONTENT_LIMITS.theoryContent,
  })
  @IsOptional()
  @IsString()
  @MaxLength(CONTENT_LIMITS.theoryContent)
  content?: string | null;

  @ApiPropertyOptional({
    description:
      'Tên nhóm Tự chọn 1 (tiết thực hành IT), vd "Khoa học máy tính"',
    nullable: true,
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  elective1Name?: string | null;

  @ApiPropertyOptional({
    description:
      'Tên nhóm Tự chọn 2 (tiết thực hành IT), vd "Tin học ứng dụng"',
    nullable: true,
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  elective2Name?: string | null;
}

export interface LessonResponseDto {
  id: string;
  kind: LessonKind;
  courseId: string | null;
  moduleId: string | null;
  classId: string | null;
  title: string;
  videoUrl: string | null;
  content: string | null;
  order: number;
  /** Tên nhóm tự chọn (tiết thực hành IT). */
  elective1Name?: string | null;
  elective2Name?: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Có trên GET list tiết trong chuyên đề — số câu hỏi ôn nhẹ (lý thuyết). */
  quizCount?: number;
  /** Có trên GET list tiết trong chuyên đề — số câu hỏi gắn (thực hành). */
  questionCount?: number;
}

/**
 * Một dòng trong Thư viện đề thi: tiết `practice` của khoá, kèm chuyên đề
 * chứa nó và số câu hỏi đã gắn.
 */
export interface ExamLibraryItemDto extends LessonResponseDto {
  module: { id: string; title: string; sortOrder: number } | null;
  questionCount: number;
}

export class ModuleCreateDto {
  @ApiPropertyOptional({
    description:
      'ID khoá học. POST /course/:courseId/modules lấy id từ path; body có thể bỏ qua.',
  })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({
    description: 'Tiêu đề chuyên đề',
    example: 'Đại số tuyến tính',
  })
  @IsString()
  title: string;
}

export class ModuleUpdateDto {
  @ApiPropertyOptional({ description: 'Tiêu đề chuyên đề' })
  @IsOptional()
  @IsString()
  title?: string;
}

export interface ModuleResponseDto {
  id: string;
  courseId: string;
  title: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  /** Có trên GET list chuyên đề của khoá. */
  lessonCount?: number;
}

export class ClassContentCreateDto {
  @ApiProperty({
    description:
      'ID tiết thực hành có sẵn của khoá để giao cho lớp. Tiết lý thuyết vào lớp theo chuyên đề (POST /class/:classId/modules).',
  })
  @IsString()
  lessonId!: string;

  @ApiPropertyOptional({
    description:
      'Thời điểm mở bài của lần giao (ISO 8601). Tuỳ chọn khi thực hành: bỏ trống thì backend lấy thời điểm item được thêm vào lớp (đồng hồ server, không phải giờ client).',
    example: '2026-09-07T13:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  openAt?: string;

  @ApiPropertyOptional({
    description:
      'Thời lượng làm bài (phút) của lần giao. Bắt buộc khi tiết thực hành. 1–720.',
    example: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(PRACTICE_DURATION_MIN_MINUTES)
  @Max(PRACTICE_DURATION_MAX_MINUTES)
  durationMinutes?: number;

  @ApiPropertyOptional({
    description:
      'Đảo câu: mỗi lượt làm xáo thứ tự câu (đề IT xáo trong từng nhóm Phần I / bắt buộc / Tự chọn 1 / Tự chọn 2) và thứ tự phương án, nhận định. Câu có phương án nhắc vị trí (vd «Cả A và B», «ở trên») giữ nguyên thứ tự phương án. Mặc định true khi tạo; chỉ áp cho lượt bắt đầu sau khi đổi.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;
}

export class ClassContentScheduleUpdateDto {
  @ApiProperty({
    description: 'Thời điểm mở bài của lần giao (ISO 8601). Không đụng đề.',
    example: '2026-09-07T13:00:00.000Z',
  })
  @IsDateString()
  openAt: string;

  @ApiProperty({
    description:
      'Thời lượng làm bài (phút) của lần giao. 1–720. Không đụng đề.',
    example: 90,
  })
  @IsInt()
  @Min(PRACTICE_DURATION_MIN_MINUTES)
  @Max(PRACTICE_DURATION_MAX_MINUTES)
  durationMinutes: number;

  @ApiPropertyOptional({
    description:
      'Đảo câu: mỗi lượt làm xáo thứ tự câu (đề IT xáo trong từng nhóm Phần I / bắt buộc / Tự chọn 1 / Tự chọn 2) và thứ tự phương án, nhận định. Câu có phương án nhắc vị trí (vd «Cả A và B», «ở trên») giữ nguyên thứ tự phương án. Mặc định true khi tạo; chỉ áp cho lượt bắt đầu sau khi đổi.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;
}

export interface ClassContentItemResponseDto {
  id: string;
  lessonId: string;
  kind: 'lesson';
  lessonKind: 'theory' | 'practice';
  sortOrder: number;
  title: string;
  kindLabel: string;
  source: 'course' | 'class';
  moduleId?: string;
  moduleTitle?: string;
  openAt: Date | string | null;
  durationMinutes: number | null;
  /** Đảo câu + đảo phương án mỗi lượt làm. */
  shuffleQuestions: boolean;
  isOpen: boolean;
  hiddenAt: Date | string | null;
  hiddenByStaffId: string | null;
}

/** Nội dung lớp gom theo chuyên đề (trang lớp admin/staff). */
export interface ClassContentModuleGroupDto {
  /** `null` = nhóm item không thuộc chuyên đề nào (xếp cuối). */
  moduleId: string | null;
  title: string;
  /** `false` = lớp đã gỡ chuyên đề (còn lần giao thực hành / item ẩn) hoặc nhóm `null`. */
  added: boolean;
  /** Theo `order` tiết trong chuyên đề. */
  theoryItems: ClassContentItemResponseDto[];
  /** Theo `sortOrder` item. */
  practiceItems: ClassContentItemResponseDto[];
}

export interface TheoryLessonViewResponseDto {
  classContentItemId: string;
  lessonId: string;
  studentId: string;
  lastViewedAt: Date | string;
}

export interface ClassTheoryProgressStudentDto {
  studentId: string;
  studentName: string;
  viewed: boolean;
  lastViewedAt: Date | string | null;
  completedQuiz: boolean;
  answeredQuizQuestionCount: number;
  quizQuestionCount: number;
}

export interface ClassTheoryProgressDto {
  classId: string;
  classContentItemId: string;
  lessonId: string;
  title: string;
  rosterCount: number;
  viewedCount: number;
  completedQuizCount: number;
  quizQuestionCount: number;
  students: ClassTheoryProgressStudentDto[];
}

export class QuestionLinkCreateDto {
  @ApiProperty({ description: 'ID câu hỏi từ ngân hàng câu hỏi' })
  @IsString()
  questionId: string;

  @ApiPropertyOptional({ description: 'Thứ tự hiển thị', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number | null;

  @ApiPropertyOptional({
    description: 'Điểm của câu hỏi',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number | null;

  @ApiPropertyOptional({
    description:
      'Vị trí câu trong đề (chỉ hồ sơ IT): required = Bắt buộc, elective_1/2 = Tự chọn 1/2',
    enum: ['required', 'elective_1', 'elective_2'],
  })
  @IsOptional()
  @IsIn(['required', 'elective_1', 'elective_2'])
  slot?: 'required' | 'elective_1' | 'elective_2';
}

export class QuestionLinkUpdateDto {
  @ApiPropertyOptional({ description: 'Thứ tự hiển thị', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number | null;

  @ApiPropertyOptional({
    description: 'Điểm của câu hỏi',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number | null;

  @ApiPropertyOptional({
    description:
      'Vị trí câu trong đề (chỉ hồ sơ IT): required = Bắt buộc, elective_1/2 = Tự chọn 1/2',
    enum: ['required', 'elective_1', 'elective_2'],
  })
  @IsOptional()
  @IsIn(['required', 'elective_1', 'elective_2'])
  slot?: 'required' | 'elective_1' | 'elective_2';
}

export class ReorderQuestionLinksDto {
  @ApiProperty({
    description: 'Danh sách ID theo thứ tự mới',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  linkIds: string[];
}

export interface QuestionLinkResponseDto {
  id: string;
  lessonId: string;
  questionId: string;
  order: number | null;
  points: number | null;
  slot: 'required' | 'elective_1' | 'elective_2';
  question: {
    id: string;
    courseId: string;
    moduleId: string;
    difficultyLevelId: string;
    type: string;
    content: string;
    options: unknown;
    tfAnswerKey: boolean[];
  };
}

export class LessonQuizLinkDto {
  @ApiProperty({
    description: 'Danh sách ID câu hỏi từ ngân hàng cần gắn vào tiết lý thuyết',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  questionIds: string[];
}

export class LessonQuizAnswerDto {
  @ApiProperty({ description: 'ID câu hỏi' })
  @IsString()
  questionId: string;

  @ApiPropertyOptional({
    description: 'Chỉ số đáp án chọn (0-based, cho trắc nghiệm)',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  choiceIndex?: number | null;

  @ApiPropertyOptional({
    description: 'Nội dung trả lời (cho tự luận)',
    nullable: true,
    maxLength: CONTENT_LIMITS.essayAnswer,
  })
  @IsOptional()
  @IsString()
  @MaxLength(CONTENT_LIMITS.essayAnswer)
  essayAnswer?: string | null;

  @ApiPropertyOptional({
    description:
      'Lựa chọn 4 nhận định a–d (câu Đúng/Sai): true = Đúng, false = Sai, null = chưa chọn',
    nullable: true,
    type: [Boolean],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  tfChoices?: (boolean | null)[] | null;
}

export interface LessonQuizResponseDto {
  id: string;
  lessonId: string;
  questionId: string;
  order: number;
  question: {
    id: string;
    type: string;
    content: string;
    options: string[] | null;
    correctIndex: number | null;
    tfAnswerKey: boolean[];
    explanation: string | null;
    answerGuide: string | null;
  };
}

export interface QuestionLinkSummaryDto {
  totalQuestions: number;
  totalPoints: number;
  /** Lý do đề sai form nhóm tự chọn (IT), null khi hợp lệ. Đề sai form bị chặn lúc bắt đầu làm bài. */
  formWarning: string | null;
}

export interface LessonQuizAnswerResponseDto {
  id: string;
  lessonId: string;
  questionId: string;
  studentId: string;
  choiceIndex: number | null;
  essayAnswer: string | null;
  tfChoices: (boolean | null)[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseLessonForClassDto {
  id: string;
  title: string;
  kind: LessonKind;
  moduleTitle: string;
  moduleId: string;
  alreadyAdded: boolean;
}

export class ClassModuleAddDto {
  @ApiProperty({
    description:
      'ID chuyên đề thuộc khoá của lớp. Thêm chuyên đề đưa mọi tiết lý thuyết của chuyên đề vào lớp và đưa nhóm lên đầu; tiết thực hành không đi theo.',
    example: '6f1c2c0e-2a5b-4d7e-9a35-1f3d7c9b2e10',
  })
  @IsString()
  moduleId: string;
}

export class ClassModuleReorderDto {
  @ApiProperty({
    type: [String],
    description:
      'Toàn bộ ID chuyên đề lớp đã thêm, đúng một lần mỗi ID, theo thứ tự hiển thị mới (trên → dưới).',
  })
  @IsArray()
  @ArrayUnique({ message: 'moduleIds không được trùng' })
  @IsString({ each: true })
  moduleIds: string[];
}

/** Ảnh hưởng nếu gỡ chuyên đề: dialog xác nhận báo trước, không chặn gỡ. */
export interface ClassModuleRemovalImpactDto {
  moduleId: string;
  /** Số câu tự luận đã nộp nhưng chưa chấm, thuộc lần giao của chuyên đề trong lớp. */
  ungradedEssayCount: number;
  /** Số học sinh đang làm dở (bài chưa nộp) lần giao của chuyên đề trong lớp. */
  inProgressStudentCount: number;
}

/** Một chuyên đề của khoá, nhìn từ một lớp: đã thêm hay chưa + số tiết. */
export interface ClassModuleResponseDto {
  moduleId: string;
  title: string;
  /** Thứ tự chuyên đề trong khoá. */
  sortOrder: number;
  /** Thứ tự nhóm của riêng lớp (nhỏ lên trước); null khi lớp chưa thêm. */
  classSortOrder: number | null;
  theoryLessonCount: number;
  practiceLessonCount: number;
  added: boolean;
  addedAt: Date | string | null;
}
