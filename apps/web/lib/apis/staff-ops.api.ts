import type { ClassDetail, ClassListResponse } from "@/dtos/class.dto";
import type { SessionItem } from "@/dtos/session.dto";
import type {
  StaffOpsCreateClassPayload,
  StaffOpsCreateSessionPayload,
  StaffOpsSessionMonthYearParams,
  StaffOpsUpdateClassSchedulePayload,
  StaffOpsUpdateSessionPayload,
} from "@/dtos/staff-ops.dto";
import { api } from "../client";

export async function getClasses(params: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  type?: string;
}): Promise<ClassListResponse> {
  const response = await api.get("/staff-ops/classes", {
    params: {
      page: params.page,
      limit: params.limit,
      ...(params.search ? { search: params.search } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.type ? { type: params.type } : {}),
    },
  });

  const payload = response.data as ClassListResponse;
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    meta: {
      total: payload?.meta?.total ?? 0,
      page: payload?.meta?.page ?? params.page,
      limit: payload?.meta?.limit ?? params.limit,
    },
  };
}

export async function getClassById(id: string): Promise<ClassDetail> {
  const safeId = encodeURIComponent(id);
  const response = await api.get(`/staff-ops/classes/${safeId}`);
  return response.data as ClassDetail;
}

export async function createClass(
  data: StaffOpsCreateClassPayload,
): Promise<ClassDetail> {
  const response = await api.post("/staff-ops/classes", data);
  return response.data as ClassDetail;
}

export async function updateClassSchedule(
  id: string,
  data: StaffOpsUpdateClassSchedulePayload,
): Promise<ClassDetail> {
  const safeId = encodeURIComponent(id);
  const response = await api.patch(`/staff-ops/classes/${safeId}/schedule`, data);
  return response.data as ClassDetail;
}

export async function getSessionsByClassId(
  classId: string,
  params: StaffOpsSessionMonthYearParams,
): Promise<SessionItem[]> {
  const safeId = encodeURIComponent(classId);
  const response = await api.get(`/staff-ops/classes/${safeId}/sessions`, {
    params,
  });
  return Array.isArray(response.data) ? (response.data as SessionItem[]) : [];
}

export async function createSession(
  classId: string,
  data: StaffOpsCreateSessionPayload,
): Promise<SessionItem> {
  const safeId = encodeURIComponent(classId);
  const response = await api.post(`/staff-ops/classes/${safeId}/sessions`, data);
  return response.data as SessionItem;
}

export async function updateSession(
  id: string,
  data: StaffOpsUpdateSessionPayload,
): Promise<SessionItem> {
  const safeId = encodeURIComponent(id);
  const response = await api.put(`/staff-ops/sessions/${safeId}`, data);
  return response.data as SessionItem;
}
