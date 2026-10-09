import { BadRequestException } from '@nestjs/common';
import { assertNever } from 'src/common/assert-never';
import type {
  LmsProfileConfig,
  LmsQuestionType,
} from '../lms-profile/lms-profile';

/** Hình dạng câu hỏi theo loại + hồ sơ môn. Trả lỗi tiếng Việt hoặc null. */
export interface QuestionShape {
  type: string;
  options?: unknown;
  correctIndex?: number | null;
  tfAnswerKey?: boolean[] | null;
}

const TYPE_LABEL: Record<LmsQuestionType, string> = {
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
    return `Hồ sơ ${profile.profile.toUpperCase()} không hỗ trợ câu ${TYPE_LABEL[shape.type as LmsQuestionType] ?? shape.type}.`;
  }
  const options = Array.isArray(shape.options) ? shape.options : null;
  const hasKey = (shape.tfAnswerKey?.length ?? 0) > 0;
  const type = shape.type as LmsQuestionType;
  switch (type) {
    case 'single_choice': {
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
      return null;
    }
    case 'true_false_group':
      if (!options || options.length !== 4) {
        return 'Câu Đúng/Sai phải có đúng 4 nhận định a–d.';
      }
      if (shape.tfAnswerKey?.length !== 4) {
        return 'Câu Đúng/Sai phải có đáp án cho đủ 4 nhận định.';
      }
      if (shape.correctIndex !== undefined && shape.correctIndex !== null) {
        return 'Câu Đúng/Sai không dùng correctIndex.';
      }
      return null;
    case 'essay':
      if (options?.length) return 'Câu tự luận không có phương án.';
      if (hasKey) return 'Câu tự luận không có đáp án Đúng/Sai.';
      return null;
    default:
      return assertNever(type, 'question type');
  }
}

/**
 * Kỹ năng theo hồ sơ: JP bắt buộc ≥1 khi tạo/sửa (câu cũ rỗng chỉ bị đòi khi
 * sửa), hồ sơ khác không có kỹ năng.
 */
export function questionSkillsError(
  skills: readonly string[],
  profile: LmsProfileConfig,
): string | null {
  if (!profile.questionSkills) {
    return skills.length
      ? `Hồ sơ ${profile.profile.toUpperCase()} không có kỹ năng câu hỏi.`
      : null;
  }
  if (!skills.length) return 'Câu hỏi phải chọn ít nhất một kỹ năng.';
  if (new Set(skills).size !== skills.length) return 'Kỹ năng bị chọn trùng.';
  return null;
}

export function assertQuestionSkills(
  skills: readonly string[],
  profile: LmsProfileConfig,
  prefix = '',
): void {
  const error = questionSkillsError(skills, profile);
  if (error) throw new BadRequestException(`${prefix}${error}`);
}

export function assertQuestionShape(
  shape: QuestionShape,
  profile: LmsProfileConfig,
  prefix = '',
): void {
  const error = questionShapeError(shape, profile);
  if (error) throw new BadRequestException(`${prefix}${error}`);
}
