import type { PrismaService } from '../prisma/prisma.service';

type LinkClient = Pick<PrismaService, 'questionLink'>;

/**
 * Tiết đi theo bộ (ADR 2026-10-09-question-set): câu mới vào bộ được thêm vào
 * mọi tiết đang dùng bộ, ngay sau câu cuối của bộ trong tiết, trọng số mặc
 * định. Lượt đã bắt đầu đọc snapshot nên không đổi.
 */
export async function linkQuestionToSetLessons(
  tx: LinkClient,
  questionId: string,
  sharedMaterialId: string,
): Promise<void> {
  const setLinks = await tx.questionLink.findMany({
    where: {
      questionId: { not: questionId },
      question: { sharedMaterialId, deletedAt: null },
    },
    select: { lessonId: true, order: true },
  });
  const lastOrder = new Map<string, number>();
  for (const { lessonId, order } of setLinks) {
    lastOrder.set(
      lessonId,
      Math.max(lastOrder.get(lessonId) ?? -1, order ?? 0),
    );
  }
  for (const [lessonId, last] of lastOrder) {
    await tx.questionLink.updateMany({
      where: { lessonId, order: { gt: last } },
      data: { order: { increment: 1 } },
    });
    await tx.questionLink.create({
      data: { lessonId, questionId, order: last + 1, points: null },
    });
  }
}
