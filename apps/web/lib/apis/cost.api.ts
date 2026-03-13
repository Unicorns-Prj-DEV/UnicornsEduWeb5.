import {
  CostDetailResponse,
  CostListResponse,
  CreateCostPayload,
  UpdateCostPayload,
} from "@/dtos/cost.dto";
import { api } from "../client";

export async function getCosts(params: {
  page: number;
  limit: number;
  search?: string;
}): Promise<CostListResponse> {
  const response = await api.get("/cost", {
    params: {
      page: params.page,
      limit: params.limit,
      ...(params.search ? { search: params.search } : {}),
    },
  });

  const payload = response.data as CostListResponse;
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    meta: {
      total: payload?.meta?.total ?? 0,
      page: payload?.meta?.page ?? params.page,
      limit: payload?.meta?.limit ?? params.limit,
    },
  };
}

export async function getCostById(id: string): Promise<CostDetailResponse> {
  const safeId = encodeURIComponent(id);
  const response = await api.get(`/cost/${safeId}`);
  return response.data as CostDetailResponse;
}

export async function createCost(data: CreateCostPayload): Promise<CostDetailResponse> {
  const response = await api.post("/cost", data);
  return response.data as CostDetailResponse;
}

export async function updateCost(data: UpdateCostPayload): Promise<CostDetailResponse> {
  const response = await api.patch("/cost", data);
  return response.data as CostDetailResponse;
}

export async function deleteCostById(id: string) {
  const safeId = encodeURIComponent(id);
  const response = await api.delete(`/cost/${safeId}`);
  return response.data;
}
