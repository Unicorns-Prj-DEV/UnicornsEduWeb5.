/** Ticket #64 — Thống kê lần giao luyện tập (Màn 12). */
import type { AttemptScoringDto } from "@/dtos/attempt.dto";

export type PracticeStatsStudentStatus =
  | "graded"
  | "pending_essay"
  | "not_started";

export interface PracticeStatsQuestionRateDto {
  questionId: string;
  order: number;
  type: "single_choice" | "essay" | "true_false_group";
  correctCount: number;
  sampleCount: number;
  /** 0..1, chỉ trên lượt tốt nhất đã chấm xong. */
  correctRate: number;
}

export interface PracticeStatsStudentRowDto {
  studentId: string;
  studentName: string;
  score: number | null;
  /** `equal_100`: 100. `absolute_it`: tổng tối đa của đề (đơn vị 1/100 điểm). */
  scoreMax: number | null;
  attemptCount: number;
  durationMs: number | null;
  status: PracticeStatsStudentStatus;
}

export interface PracticeStatsDto {
  classId: string;
  assignmentId: string;
  title: string;
  className: string;
  openAt: string | null;
  durationMinutes: number | null;
  submittedCount: number;
  rosterCount: number;
  averageScore: number | null;
  /** Thang điểm để hiển thị: `absolute_it` thì điểm hiển thị = giá trị / 100. */
  scoring: AttemptScoringDto;
  /** Điểm tối đa của đề (lượt chấm xong gần nhất); null nếu chưa ai làm. */
  scoreMax: number | null;
  pendingEssayCount: number;
  questions: PracticeStatsQuestionRateDto[];
  students: PracticeStatsStudentRowDto[];
}
