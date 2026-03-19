import {
  SessionCreatePayload,
  SessionItem,
  SessionMonthYearParams,
  SessionUnpaidSummaryItem,
  SessionUnpaidSummaryParams,
  SessionUpdatePayload,
} from "@/dtos/session.dto";
import { api } from "../client";

export async function getSessionsByClassId(
  classId: string,
  params: SessionMonthYearParams,
): Promise<SessionItem[]> {
  const safeId = encodeURIComponent(classId);
  const response = await api.get(`/sessions/class/${safeId}`, {
    params,
  });
  const payload = response.data;
  return Array.isArray(payload) ? payload : [];
}

export async function getSessionsByStaffId(
  staffId: string,
  params: SessionMonthYearParams,
): Promise<SessionItem[]> {
  const safeId = encodeURIComponent(staffId);
  const response = await api.get(`/sessions/staff/${safeId}`, {
    params,
  });
  const payload = response.data;
  return Array.isArray(payload) ? payload : [];
}

export async function getUnpaidSessionsByStaffId(
  staffId: string,
  params?: SessionUnpaidSummaryParams,
): Promise<SessionUnpaidSummaryItem[]> {
  const safeId = encodeURIComponent(staffId);
  const response = await api.get(`/sessions/staff/${safeId}/unpaid`, {
    params,
  });
  const payload = response.data;
  return Array.isArray(payload) ? payload : [];
}

export async function createSession(data: SessionCreatePayload): Promise<SessionItem> {
  const response = await api.post("/sessions", data);
  return response.data as SessionItem;
}

export async function updateSession(id: string, data: SessionUpdatePayload): Promise<SessionItem> {
  const safeId = encodeURIComponent(id);
  const response = await api.put(`/sessions/${safeId}`, data);
  return response.data as SessionItem;
}

export async function deleteSession(id: string): Promise<void> {
  const safeId = encodeURIComponent(id);
  await api.delete(`/sessions/${safeId}`);
}
