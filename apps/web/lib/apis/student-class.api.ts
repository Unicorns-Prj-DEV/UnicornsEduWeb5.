import { api } from "@/lib/client";
import type {
  StudentClassItem,
  StudentSessionItem,
  StudentSurveyItem,
  StudentTopicItem,
} from "@/dtos/student-class.dto";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export async function getMyClasses(): Promise<StudentClassItem[]> {
  const { data } = await api.get("/users/me/student-classes");
  return data;
}

export async function getMyClassDetail(
  classId: string,
): Promise<StudentClassItem> {
  const { data } = await api.get(`/users/me/student-classes/${classId}/detail`);
  return data;
}

export async function getMyClassSessions(
  classId: string,
): Promise<StudentSessionItem[]> {
  const { data } = await api.get(
    `/users/me/student-classes/${classId}/sessions`,
  );
  return data;
}

export async function getMyClassSurveys(
  classId: string,
): Promise<StudentSurveyItem[]> {
  const { data } = await api.get(
    `/users/me/student-classes/${classId}/surveys`,
  );
  return data;
}

export async function getMyClassTopics(
  classId: string,
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<StudentTopicItem>> {
  const { data } = await api.get(
    `/users/me/student-classes/${classId}/topics`,
    { params: { page, limit } },
  );
  return data;
}

export async function getMyClassTopic(
  classId: string,
  topicId: string,
): Promise<StudentTopicItem> {
  const { data } = await api.get(
    `/users/me/student-classes/${classId}/topics/${topicId}`,
  );
  return data;
}
