/**
 * Hồ sơ môn của instance (ADR `2026-10-07-instance-subject-profile`).
 * Mọi khoá trên một instance dùng chung bộ luật câu hỏi này.
 */
export const LMS_PROFILES = ['it', 'jp', 'eng'] as const;
export type LmsProfile = (typeof LMS_PROFILES)[number];

/** `equal_100`: chia đều 100 cho N câu. `absolute_it`: điểm tuyệt đối theo loại câu, đơn vị 1/100 điểm. */
export type LmsScoring = 'equal_100' | 'absolute_it';

export type LmsQuestionType = 'single_choice' | 'essay' | 'true_false_group';

export interface LmsProfileConfig {
  profile: LmsProfile;
  questionTypes: LmsQuestionType[];
  optionCount: { min: number; max: number; default: number };
  scoring: LmsScoring;
  electiveGroups: boolean;
}

const OPTION_COUNT = { min: 2, max: 6, default: 4 };

const PROFILE_CONFIGS: Record<LmsProfile, LmsProfileConfig> = {
  it: {
    profile: 'it',
    questionTypes: ['single_choice', 'true_false_group'],
    optionCount: OPTION_COUNT,
    scoring: 'absolute_it',
    electiveGroups: true,
  },
  jp: {
    profile: 'jp',
    questionTypes: ['single_choice', 'essay'],
    optionCount: OPTION_COUNT,
    scoring: 'equal_100',
    electiveGroups: false,
  },
  eng: {
    profile: 'eng',
    questionTypes: ['single_choice', 'essay'],
    optionCount: OPTION_COUNT,
    scoring: 'equal_100',
    electiveGroups: false,
  },
};

/**
 * Đọc `LMS_PROFILE`. Thiếu hoặc sai giá trị thì ném lỗi — không có mặc định,
 * để instance quên đặt biến không lặng lẽ chấm sai luật.
 */
export function loadLmsProfile(
  env: Record<string, string | undefined>,
): LmsProfileConfig {
  const raw = env.LMS_PROFILE?.trim().toLowerCase();
  if (!raw || !(LMS_PROFILES as readonly string[]).includes(raw)) {
    throw new Error(
      `LMS_PROFILE phải là một trong ${LMS_PROFILES.join(' | ')} (nhận: ${
        env.LMS_PROFILE === undefined ? 'không đặt' : JSON.stringify(env.LMS_PROFILE)
      }).`,
    );
  }
  return PROFILE_CONFIGS[raw as LmsProfile];
}

export function lmsProfileConfig(profile: LmsProfile): LmsProfileConfig {
  return PROFILE_CONFIGS[profile];
}
