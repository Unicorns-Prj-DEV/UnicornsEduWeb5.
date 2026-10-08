/** Hồ sơ môn của instance — `GET /public/app-config`. */
export type LmsProfile = "it" | "jp" | "eng";

/**
 * `equal_100`: chia đều 100 cho N câu.
 * `absolute_it`: điểm tuyệt đối, lưu đơn vị 1/100 điểm (trắc nghiệm 25, Đúng/Sai tối đa 100).
 */
export type LmsScoring = "equal_100" | "absolute_it";

export type LmsQuestionType = "single_choice" | "essay" | "true_false_group";

export interface AppConfig {
  profile: LmsProfile;
  questionTypes: LmsQuestionType[];
  optionCount: { min: number; max: number; default: number };
  scoring: LmsScoring;
  electiveGroups: boolean;
}
