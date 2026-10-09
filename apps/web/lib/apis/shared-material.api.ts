import { api } from "@/lib/client";
import type {
  CreateSharedMaterialInput,
  SharedMaterial,
  UpdateSharedMaterialInput,
} from "@/dtos/shared-material.dto";

export async function getSharedMaterials(
  courseId: string,
): Promise<SharedMaterial[]> {
  const response = await api.get<SharedMaterial[]>("/shared-materials", {
    params: { courseId },
  });
  return response.data;
}

export async function createSharedMaterial(
  data: CreateSharedMaterialInput,
): Promise<SharedMaterial> {
  const response = await api.post<SharedMaterial>("/shared-materials", data);
  return response.data;
}

export async function updateSharedMaterial(
  id: string,
  data: UpdateSharedMaterialInput,
): Promise<SharedMaterial> {
  const response = await api.patch<SharedMaterial>(
    `/shared-materials/${id}`,
    data,
  );
  return response.data;
}

/** Sắp lại thứ tự câu trong bộ — gửi đủ mọi câu của bộ theo thứ tự mới. */
export async function reorderSetQuestions(
  id: string,
  questionIds: string[],
): Promise<void> {
  await api.put(`/shared-materials/${id}/question-order`, { questionIds });
}

export async function deleteSharedMaterial(id: string): Promise<void> {
  await api.delete(`/shared-materials/${id}`);
}
