export type AchievementDto = {
  id: string;
  title: string;
  imagePath: string | null;
  imageUrl: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateAchievementPayload = {
  title: string;
  sortOrder?: number;
};

export type UpdateAchievementPayload = {
  title?: string;
  sortOrder?: number;
};

export type ReorderAchievementsPayload = {
  orderedIds: string[];
};

export type AchievementOwnerRef =
  | { kind: "staff"; mode: "admin"; staffId: string }
  | { kind: "staff"; mode: "self" }
  | { kind: "student"; mode: "admin"; studentId: string };
