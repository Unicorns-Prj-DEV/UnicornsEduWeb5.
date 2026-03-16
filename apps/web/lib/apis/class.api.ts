import { ClassListResponse, ClassStatus, ClassType } from '@/dtos/class.dto';
import {
  ClassDetail,
  CreateClassPayload,
  UpdateClassBasicInfoPayload,
  UpdateClassPayload,
  UpdateClassSchedulePayload,
  UpdateClassStudentsPayload,
  UpdateClassTeachersPayload,
} from '@/dtos/class.dto';
import { api } from "../client";

export async function getClasses(params: {
  page: number;
  limit: number;
  search?: string;
  status?: "" | ClassStatus;
  type?: "" | ClassType;
}): Promise<ClassListResponse> {
  const response = await api.get("/class", {
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
  const response = await api.get(`/class/${safeId}`);
  return response.data;
}

export async function createClass(data: CreateClassPayload): Promise<ClassDetail> {
  const response = await api.post('/class', data);
  return response.data;
}

export async function deleteClassById(id: string) {
  const safeId = encodeURIComponent(id);
  const response = await api.delete(`/class/${safeId}`);
  return response.data;
}

export async function updateClass(data: UpdateClassPayload): Promise<ClassDetail> {
  const response = await api.patch("/class", data);
  return response.data;
}

export async function updateClassBasicInfo(
  id: string,
  data: UpdateClassBasicInfoPayload,
): Promise<ClassDetail> {
  const safeId = encodeURIComponent(id);
  const response = await api.patch(`/class/${safeId}/basic-info`, data);
  return response.data;
}

export async function updateClassTeachers(
  id: string,
  data: UpdateClassTeachersPayload,
): Promise<ClassDetail> {
  const safeId = encodeURIComponent(id);
  const response = await api.patch(`/class/${safeId}/teachers`, data);
  return response.data;
}

export async function updateClassSchedule(
  id: string,
  data: UpdateClassSchedulePayload,
): Promise<ClassDetail> {
  const safeId = encodeURIComponent(id);
  const response = await api.patch(`/class/${safeId}/schedule`, data);
  return response.data;
}

export async function updateClassStudents(
  id: string,
  data: UpdateClassStudentsPayload,
): Promise<ClassDetail> {
  const safeId = encodeURIComponent(id);
  const response = await api.patch(`/class/${safeId}/students`, data);
  return response.data;
}
