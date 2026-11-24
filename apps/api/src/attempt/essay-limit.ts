import { BadRequestException } from '@nestjs/common';

/**
 * Câu trả lời tự luận vượt giới hạn ký tự gia sư đặt (`essayMaxChars`).
 * Đếm theo `String.length` (đơn vị UTF-16) — khớp `maxLength` của textarea phía web,
 * nên học sinh gõ được tới đâu thì server nhận tới đó.
 */
export function assertEssayWithinLimit(
  questions: { questionId: string; essayMaxChars: number | null }[],
  answers: { questionId: string; essayAnswer?: string | null }[],
): void {
  const limitOf = new Map(
    questions.map((q) => [q.questionId, q.essayMaxChars] as const),
  );
  answers.forEach((a, i) => {
    const max = limitOf.get(a.questionId);
    if (max == null || a.essayAnswer == null) return;
    if (a.essayAnswer.length > max) {
      throw new BadRequestException(
        `Câu trả lời tự luận vượt giới hạn ${max} ký tự (đang ${a.essayAnswer.length}, mục ${i + 1}).`,
      );
    }
  });
}
