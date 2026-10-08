import { BadRequestException } from '@nestjs/common';
import type { LmsProfileConfig } from '../lms-profile/lms-profile';

/** Hình dạng câu hỏi theo loại + hồ sơ môn. Trả lỗi tiếng Việt hoặc null. */
export interface QuestionShape {
  type: string;
  options?: unknown;
  correctIndex?: number | null;
  tfAnswerKey?: boolean[] | null;
}

const TYPE_LABEL: Record<string, string> = {
  single_choice: 'trắc nghiệm',
  essay: 'tự luận',
  true_false_group: 'Đúng/Sai',
};

export function questionShapeError(
  shape: QuestionShape,
  profile: LmsProfileConfig,
): string | null {
  if (!(profile.questionTypes as string[]).includes(shape.type)) {
    if (shape.type === 'essay' && profile.profile === 'it') {
      return 'Hồ sơ Tin học không có câu tự luận.';
    }
    return `Hồ sơ ${profile.profile.toUpperCase()} không hỗ trợ câu ${TYPE_LABEL[shape.type] ?? shape.type}.`;
  }
  const options = Array.isArray(shape.options) ? shape.options : null;
  const hasKey = (shape.tfAnswerKey?.length ?? 0) > 0;
  if (shape.type === 'single_choice') {
    const { min, max } = profile.optionCount;
    if (!options || options.length < min || options.length > max) {
      return `Câu trắc nghiệm phải có ${min}–${max} phương án.`;
    }
    if (shape.correctIndex === undefined || shape.correctIndex === null) {
      return 'Câu trắc nghiệm phải có đáp án đúng.';
    }
    if (shape.correctIndex < 0 || shape.correctIndex >= options.length) {
      return 'Đáp án đúng nằm ngoài danh sách phương án.';
    }
    if (hasKey) return 'Câu trắc nghiệm không có đáp án Đúng/Sai.';
  }
  if (shape.type === 'true_false_group') {
    if (!options || options.length !== 4) {
      return 'Câu Đúng/Sai phải có đúng 4 nhận định a–d.';
    }
    if (shape.tfAnswerKey?.length !== 4) {
      return 'Câu Đúng/Sai phải có đáp án cho đủ 4 nhận định.';
    }
    if (shape.correctIndex !== undefined && shape.correctIndex !== null) {
      return 'Câu Đúng/Sai không dùng correctIndex.';
    }
  }
  if (shape.type === 'essay') {
    if (options?.length) return 'Câu tự luận không có phương án.';
    if (hasKey) return 'Câu tự luận không có đáp án Đúng/Sai.';
  }
  return null;
}

export function assertQuestionShape(
  shape: QuestionShape,
  profile: LmsProfileConfig,
  prefix = '',
): void {
  const error = questionShapeError(shape, profile);
  if (error) throw new BadRequestException(`${prefix}${error}`);
}
