/** Tư liệu dùng chung (JP): đoạn văn/ảnh nhiều câu hỏi cùng dựa vào. */
export interface SharedMaterial {
  id: string;
  courseId: string;
  title: string;
  /** HTML (TipTap). */
  content: string;
  /** Số câu (chưa xoá) đang gắn tư liệu. */
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSharedMaterialInput {
  courseId: string;
  title: string;
  content: string;
}

export type UpdateSharedMaterialInput = Partial<
  Pick<CreateSharedMaterialInput, "title" | "content">
>;

export const SHARED_MATERIAL_TITLE_MAX = 200;
