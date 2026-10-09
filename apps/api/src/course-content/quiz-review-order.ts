import { groupByMaterial } from '../attempt/shuffle';

/**
 * Thứ tự xem lại bài tập ôn nhẹ = thứ tự lúc làm: theo thứ tự câu trong tiết,
 * câu cùng Tư liệu dùng chung dồn về khối tại câu đầu. Câu đã gỡ khỏi tiết
 * (vẫn còn câu trả lời) xuống cuối.
 */
export function orderQuizAnswers<T extends { questionId: string }>(
  answers: T[],
  quizOrder: ReadonlyMap<string, number>,
  materialOf: (answer: T) => string | null,
): T[] {
  const rank = (a: T) => quizOrder.get(a.questionId) ?? Number.MAX_SAFE_INTEGER;
  const sorted = [...answers].sort((x, y) => rank(x) - rank(y));
  return groupByMaterial(sorted, materialOf);
}
