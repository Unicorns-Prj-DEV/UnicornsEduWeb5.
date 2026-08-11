export type AchievementLevel =
  | "COMMUNE"
  | "PROVINCE"
  | "REGIONAL"
  | "NATIONAL"
  | "INTERNATIONAL"
  | "ADMISSION";

export const ACHIEVEMENT_LEVEL_OPTIONS: Array<{
  value: AchievementLevel;
  label: string;
}> = [
  { value: "COMMUNE", label: "Xã / Trường" },
  { value: "PROVINCE", label: "Tỉnh / Thành phố" },
  { value: "REGIONAL", label: "Khu vực" },
  { value: "NATIONAL", label: "Quốc gia" },
  { value: "INTERNATIONAL", label: "Quốc tế" },
  { value: "ADMISSION", label: "Đỗ chuyên" },
];

export type AchievementDto = {
  id: string;
  /** Staff freeform title; student derived `${award} · ${exam}`. */
  title: string;
  award?: string | null;
  exam?: string | null;
  year?: number | null;
  level?: AchievementLevel | null;
  courseLabel?: string | null;
  imagePath: string | null;
  imageUrl: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateStaffAchievementPayload = {
  title: string;
  sortOrder?: number;
};

export type UpdateStaffAchievementPayload = {
  title?: string;
  sortOrder?: number;
};

export type CreateStudentAchievementPayload = {
  award: string;
  exam: string;
  year: number;
  level: AchievementLevel;
  courseLabel?: string | null;
  sortOrder?: number;
};

export type UpdateStudentAchievementPayload = Partial<CreateStudentAchievementPayload>;

/** @deprecated Use CreateStaffAchievementPayload / CreateStudentAchievementPayload */
export type CreateAchievementPayload = CreateStaffAchievementPayload;

/** @deprecated Use UpdateStaffAchievementPayload / UpdateStudentAchievementPayload */
export type UpdateAchievementPayload = UpdateStaffAchievementPayload;

export type ReorderAchievementsPayload = {
  orderedIds: string[];
};

export type AchievementOwnerRef =
  | { kind: "staff"; mode: "admin"; staffId: string }
  | { kind: "staff"; mode: "self" }
  | { kind: "student"; mode: "admin"; studentId: string };
