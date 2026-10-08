import type { AttemptQuestionDto } from "@/dtos/attempt.dto";
import { touchedElectiveGroups } from "@/lib/exam-layout";

export type AttemptQuestionVisualStatus =
  | "unanswered"
  | "answered"
  | "marked_for_review";

export function isAttemptQuestionUnanswered(q: AttemptQuestionDto): boolean {
  if (q.type === "single_choice") return q.choiceIndex == null;
  // Câu Đúng/Sai chỉ tính đã làm khi đủ cả 4 nhận định.
  if (q.type === "true_false_group") {
    const choices = q.tfChoices ?? [];
    return [0, 1, 2, 3].some((i) => typeof choices[i] !== "boolean");
  }
  return !q.essayAnswer?.trim();
}

export function getAttemptQuestionVisualStatus(
  q: AttemptQuestionDto,
): AttemptQuestionVisualStatus {
  if (q.markedForReview) return "marked_for_review";
  if (isAttemptQuestionUnanswered(q)) return "unanswered";
  return "answered";
}

/**
 * Vị trí (1-based) các câu chưa làm. Đã chọn một nhóm tự chọn thì câu của nhóm
 * kia không tính là "chưa làm" — học sinh chỉ được làm một nhóm.
 */
export function unansweredQuestionNumbers(
  questions: AttemptQuestionDto[],
): number[] {
  const touched = touchedElectiveGroups(questions);
  return questions.flatMap((q, i) => {
    if (q.slot && q.slot !== "required" && touched.size > 0 && !touched.has(q.slot)) {
      return [];
    }
    return isAttemptQuestionUnanswered(q) ? [i + 1] : [];
  });
}

export function markedForReviewQuestionNumbers(
  questions: AttemptQuestionDto[],
): number[] {
  return questions.flatMap((q, i) => (q.markedForReview ? [i + 1] : []));
}

export function answeredQuestionCount(questions: AttemptQuestionDto[]): number {
  return questions.length - unansweredQuestionNumbers(questions).length;
}

export function answersSignature(questions: AttemptQuestionDto[]): string {
  return JSON.stringify(
    questions.map((q) => ({
      id: q.questionId,
      c: q.choiceIndex,
      e: q.essayAnswer ?? "",
      t: q.tfChoices ?? null,
      m: q.markedForReview ?? false,
    })),
  );
}

export function formatSavedAt(at: Date): string {
  const hh = String(at.getHours()).padStart(2, "0");
  const mm = String(at.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
