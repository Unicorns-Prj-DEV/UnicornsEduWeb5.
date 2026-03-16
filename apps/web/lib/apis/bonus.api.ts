import {
  BonusDetail,
  BonusListResponse,
  CreateBonusPayload,
  UpdateBonusPayload,
} from "@/dtos/bonus.dto";
import { api } from "../client";

export async function getBonuses(params: {
  page: number;
  limit: number;
  staffId?: string;
  month?: string;
  status?: string;
}): Promise<BonusListResponse> {
  const response = await api.get("/bonus", {
    params: {
      page: params.page,
      limit: params.limit,
      ...(params.staffId ? { staffId: params.staffId } : {}),
      ...(params.month ? { month: params.month } : {}),
      ...(params.status ? { status: params.status } : {}),
    },
  });

  const payload = response.data as BonusListResponse;
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    meta: {
      total: payload?.meta?.total ?? 0,
      page: payload?.meta?.page ?? params.page,
      limit: payload?.meta?.limit ?? params.limit,
    },
  };
}

export async function getBonusById(id: string): Promise<BonusDetail> {
  const safeId = encodeURIComponent(id);
  const response = await api.get(`/bonus/${safeId}`);
  return response.data as BonusDetail;
}

export async function createBonus(data: CreateBonusPayload): Promise<BonusDetail> {
  const response = await api.post("/bonus", data);
  return response.data as BonusDetail;
}

export async function updateBonus(data: UpdateBonusPayload): Promise<BonusDetail> {
  const response = await api.patch("/bonus", data);
  return response.data as BonusDetail;
}

export async function deleteBonusById(id: string) {
  const safeId = encodeURIComponent(id);
  const response = await api.delete(`/bonus/${safeId}`);
  return response.data;
}
