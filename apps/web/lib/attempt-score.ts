import type { AttemptScoringDto } from "@/dtos/attempt.dto";

/**
 * Hiển thị điểm Bài làm theo thang điểm (ADR it-absolute-scoring).
 * - `absolute_it`: lưu đơn vị 1/100 điểm → hiện 2 chữ số thập phân, dấu phẩy (vd 8,75).
 * - `equal_100`: thang 100/N, giữ số nguyên như cũ.
 */
export function formatScoreValue(
  value: number,
  scoring: AttemptScoringDto,
): string {
  if (scoring !== "absolute_it") return String(Math.round(value * 100) / 100);
  return (value / 100).toLocaleString("vi-VN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** `điểm/tối đa`, vd `8,75/10,00` (IT) hoặc `72/100` (JP/ENG). */
export function formatScore(
  score: number,
  max: number,
  scoring: AttemptScoringDto,
): string {
  return `${formatScoreValue(score, scoring)}/${formatScoreValue(max, scoring)}`;
}

/**
 * Nhãn điểm một lượt làm cho học sinh: tổng = trắc nghiệm + tự luận đã chấm.
 * Còn câu tự luận chưa chấm thì vẫn hiện phần đã có, kèm nhãn chờ chấm.
 */
export function attemptScoreLabel(
  attempt: {
    status: string;
    score: number | null;
    scoreMax: number;
    scoring: AttemptScoringDto;
    hasUngradedEssay: boolean;
  },
  resultsReleased: boolean,
): string {
  if (attempt.status === "in_progress") return "—";
  if (!resultsReleased) return "Điểm công bố sau hạn";
  if (attempt.score == null) return "—";
  const total = `${formatScore(attempt.score, attempt.scoreMax, attempt.scoring)} điểm`;
  return attempt.hasUngradedEssay ? `${total} · chờ chấm tự luận` : total;
}
