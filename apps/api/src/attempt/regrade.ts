import { Prisma } from '../../generated/client';
import { AttemptStatus } from 'generated/enums';
import { gradeAnswers } from './grading';
import { remapAnswerKey } from './shuffle';

/**
 * Chấm lại khi sửa đáp án đúng (ADR 2026-10-07-it-absolute-scoring-and-answer-key-regrade):
 * ghi đáp án mới vào snapshot của mọi Bài làm chứa câu (kể cả lượt đang làm),
 * rồi tính lại điểm các lượt đã đóng. Im lặng, không thông báo.
 *
 * @returns số Bài làm đã đóng được chấm lại.
 */
export async function regradeQuestionAnswerKey(
  tx: Prisma.TransactionClient,
  questionId: string,
  key: { correctIndex?: number | null; tfAnswerKey?: boolean[] },
): Promise<number> {
  const data: Prisma.AttemptAnswerUpdateManyMutationInput = {};
  if (key.correctIndex !== undefined) data.correctIndex = key.correctIndex;
  if (key.tfAnswerKey !== undefined) data.tfAnswerKey = key.tfAnswerKey;
  if (Object.keys(data).length === 0) return 0;

  // Snapshot không đảo: ghi thẳng. Snapshot đã đảo: đổi đáp án sang thứ tự hiển thị của lượt đó.
  await tx.attemptAnswer.updateMany({
    where: { questionId, optionOrder: { isEmpty: true } },
    data,
  });
  const shuffledRows = await tx.attemptAnswer.findMany({
    where: { questionId, NOT: { optionOrder: { isEmpty: true } } },
    select: { id: true, optionOrder: true },
  });
  for (const row of shuffledRows) {
    await tx.attemptAnswer.update({
      where: { id: row.id },
      data: remapAnswerKey(row.optionOrder, key),
    });
  }

  const attempts = await tx.attempt.findMany({
    where: {
      status: { in: [AttemptStatus.submitted, AttemptStatus.timed_out] },
      answers: { some: { questionId } },
    },
    include: { answers: { orderBy: { order: 'asc' } } },
  });

  for (const attempt of attempts) {
    const graded = gradeAnswers(attempt.answers, attempt.scoring);
    for (const patch of graded.patches) {
      const before = attempt.answers.find((a) => a.id === patch.id);
      // Câu tự luận giữ điểm gia sư đã chấm.
      if (!before || patch.pointsAwarded === null) continue;
      if (
        before.pointsAwarded === patch.pointsAwarded &&
        before.isCorrect === patch.isCorrect
      ) {
        continue;
      }
      await tx.attemptAnswer.update({
        where: { id: patch.id },
        data: {
          isCorrect: patch.isCorrect,
          pointsAwarded: patch.pointsAwarded,
        },
      });
    }
    await tx.attempt.update({
      where: { id: attempt.id },
      data: {
        autoGradedScore: graded.autoGradedScore,
        autoGradedMax: graded.autoGradedMax,
        electiveVoided: graded.electiveVoided,
      },
    });
  }
  return attempts.length;
}
