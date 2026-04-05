import type {
  CreateRegulationPayload,
  RegulationItem,
  UpdateRegulationPayload,
} from "@/dtos/regulation.dto";
import { api } from "../client";

export async function getRegulations(): Promise<RegulationItem[]> {
  const response = await api.get<RegulationItem[]>("/regulations");
  return Array.isArray(response.data) ? response.data : [];
}

export async function createRegulation(
  payload: CreateRegulationPayload,
): Promise<RegulationItem> {
  const response = await api.post<RegulationItem>("/regulations", payload);
  return response.data;
}

export async function updateRegulation(
  id: string,
  payload: UpdateRegulationPayload,
): Promise<RegulationItem> {
  const response = await api.patch<RegulationItem>(`/regulations/${id}`, payload);
  return response.data;
}
