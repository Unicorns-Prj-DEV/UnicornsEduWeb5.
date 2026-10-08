import type { QuestionTypeDto } from "@/dtos/question.dto";
import type { QuestionSlotDto, TrueFalseChoices } from "@/dtos/attempt.dto";

export type LessonKind = "theory" | "practice";

/** Chuyên đề — nhóm tiết học cấp cao nhất bên trong một Khoá học. */
export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  lessonCount?: number;
}

/** Tiết học — đơn vị nội dung học sinh nhìn thấy và làm việc trực tiếp. */
export interface CourseLesson {
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
  createdAt?: string;
  updatedAt?: string;
  quizCount?: number;
  questionCount?: number;
}

export interface KnowledgeTreeLessonNode {
  lesson: CourseLesson;
}

export interface KnowledgeTreeNode {
  module: CourseModule;
  lessons: KnowledgeTreeLessonNode[];
}

export interface CreateCourseModulePayload {
  title: string;
}

export interface UpdateCourseModulePayload {
  title?: string;
}

export interface CreateCourseLessonPayload {
  kind: LessonKind;
  title: string;
  videoUrl?: string | null;
  content?: string | null;
}

export interface UpdateCourseLessonPayload {
  title?: string;
  videoUrl?: string | null;
  content?: string | null;
  elective1Name?: string | null;
  elective2Name?: string | null;
}

export interface QuestionLinkQuestion {
  id: string;
  courseId: string;
  moduleId: string;
  difficultyLevelId: string;
  type: QuestionTypeDto;
  content: string;
  options: string[] | null;
  correctIndex: number | null;
  tfAnswerKey: boolean[];
  explanation: string | null;
  answerGuide: string | null;
}

export interface QuestionLink {
  id: string;
  lessonId: string;
  questionId: string;
  order: number | null;
  points: number | null;
  slot: QuestionSlotDto;
  question: QuestionLinkQuestion;
}

export interface QuestionLinkSummary {
  totalQuestions: number;
  totalPoints: number;
  /** Lý do đề sai form nhóm tự chọn (IT); null khi hợp lệ. */
  formWarning: string | null;
}

export interface CreateQuestionLinkPayload {
  questionId: string;
  order?: number | null;
  points?: number | null;
  slot?: QuestionSlotDto;
}

export interface UpdateQuestionLinkPayload {
  order?: number | null;
  points?: number | null;
  slot?: QuestionSlotDto;
}

export interface LessonQuizQuestion {
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
    tfAnswerKey?: boolean[];
    explanation: string | null;
    answerGuide: string | null;
  };
}

export interface LessonQuizAnswer {
  id: string;
  lessonId: string;
  questionId: string;
  studentId: string;
  choiceIndex: number | null;
  essayAnswer: string | null;
  tfChoices?: TrueFalseChoices | null;
  createdAt: string;
  updatedAt: string;
  question: {
    id: string;
    type: string;
    content: string;
    options: string[] | null;
    correctIndex: number | null;
    tfAnswerKey?: boolean[];
    explanation: string | null;
    answerGuide: string | null;
  };
}

export interface SubmitQuizAnswerPayload {
  questionId: string;
  choiceIndex?: number | null;
  essayAnswer?: string | null;
  tfChoices?: TrueFalseChoices | null;
}

/** Tiết học từ khoá — dùng cho panel chọn nội dung lớp. */
export interface CourseLessonForClassDto {
  id: string;
  title: string;
  kind: LessonKind;
  moduleTitle: string;
  moduleId: string;
  alreadyAdded: boolean;
}

/** Một chuyên đề của khoá nhìn từ một lớp (GET /class/:classId/modules). */
export interface ClassModuleDto {
  moduleId: string;
  title: string;
  /** Thứ tự chuyên đề trong khoá. */
  sortOrder: number;
  /** Thứ tự nhóm của riêng lớp (nhỏ lên trước); null khi lớp chưa thêm. */
  classSortOrder: number | null;
  theoryLessonCount: number;
  practiceLessonCount: number;
  added: boolean;
  addedAt: string | null;
}

/** Ảnh hưởng nếu gỡ chuyên đề — dialog xác nhận báo trước, không chặn gỡ. */
export interface ClassModuleRemovalImpactDto {
  moduleId: string;
  ungradedEssayCount: number;
  inProgressStudentCount: number;
}

export interface ExamLibraryItem extends CourseLesson {
  module: { id: string; title: string; sortOrder: number } | null;
  questionCount: number;
}

export interface ExamLibraryListResult {
  data: ExamLibraryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ExamLibraryFilters {
  search?: string;
  moduleId?: string;
  page?: number;
  limit?: number;
}
