import type {
  CreateStudentPayload,
  StudentAssignableUser,
  StudentDetail,
  StudentGender,
  StudentListItem,
  StudentListResponse,
  StudentStatus,
  StudentWalletTransaction,
  UpdateStudentAccountBalancePayload,
  UpdateStudentClassesPayload,
  UpdateStudentPayload,
} from "@/dtos/student.dto";
import { api } from "../client";

type StudentListParams = {
  page?: number;
  limit?: number;
  search?: string;
  school?: string;
  province?: string;
  status?: "" | StudentStatus;
  gender?: "" | StudentGender;
  className?: string;
};

type StudentWalletHistoryParams = {
  limit?: number;
};

export async function searchAssignableUsersByEmail(
  email: string,
): Promise<StudentAssignableUser[]> {
  const response = await api.get("/student/assignable-users", {
    params: {
      email,
    },
  });

  return Array.isArray(response.data) ? (response.data as StudentAssignableUser[]) : [];
}

/**
 * GET /student – paginated student list for admin pages.
 */
export async function getStudentList(params: StudentListParams): Promise<StudentListResponse> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;

  const response = await api.get<StudentListResponse>("/student", {
    params: {
      page,
      limit,
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      ...(params.school?.trim() ? { school: params.school.trim() } : {}),
      ...(params.province?.trim() ? { province: params.province.trim() } : {}),
      ...(params.status?.trim() ? { status: params.status.trim() } : {}),
      ...(params.gender?.trim() ? { gender: params.gender.trim() } : {}),
      ...(params.className?.trim() ? { className: params.className.trim() } : {}),
    },
  });

  const payload = response.data as StudentListResponse;
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    meta: {
      total: payload?.meta?.total ?? 0,
      page: payload?.meta?.page ?? page,
      limit: payload?.meta?.limit ?? limit,
    },
  };
}

/**
 * GET /student – unwrap paginated response for lightweight search pickers.
 */
export async function getStudents(params: StudentListParams): Promise<StudentListItem[]> {
  const response = await getStudentList({
    ...params,
    limit: params.limit ?? 50,
  });

  return response.data;
}

/**
 * GET /student/:id – get student by ID.
 */
export async function getStudentById(id: string): Promise<StudentDetail> {
  const safeId = encodeURIComponent(id);
  const response = await api.get<StudentDetail>(`/student/${safeId}`);
  return response.data;
}

/**
 * GET /student/:id/wallet-history – get latest wallet transactions for a student.
 */
export async function getStudentWalletHistory(
  id: string,
  params: StudentWalletHistoryParams = {},
): Promise<StudentWalletTransaction[]> {
  const safeId = encodeURIComponent(id);
  const response = await api.get<StudentWalletTransaction[]>(`/student/${safeId}/wallet-history`, {
    params: {
      ...(typeof params.limit === "number" ? { limit: params.limit } : {}),
    },
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function createStudent(payload: CreateStudentPayload): Promise<StudentDetail> {
  const response = await api.post<StudentDetail>("/student", payload);
  return response.data;
}

/**
 * PATCH /student/:id – update student by ID.
 */
export async function updateStudentById(
  id: string,
  payload: UpdateStudentPayload,
): Promise<StudentDetail> {
  const safeId = encodeURIComponent(id);
  const response = await api.patch<StudentDetail>(`/student/${safeId}`, payload);
  return response.data;
}

/**
 * PATCH /student/update-student-account-balance – increment/decrement student balance.
 */
export async function updateStudentAccountBalance(
  payload: UpdateStudentAccountBalancePayload,
): Promise<StudentDetail> {
  const response = await api.patch<StudentDetail>("/student/update-student-account-balance", payload);
  return response.data;
}

/**
 * PATCH /student/:id/classes – replace student memberships authoritatively in backend.
 */
export async function updateStudentClasses(
  id: string,
  payload: UpdateStudentClassesPayload,
): Promise<StudentDetail> {
  const safeId = encodeURIComponent(id);
  const response = await api.patch<StudentDetail>(`/student/${safeId}/classes`, payload);
  return response.data;
}

/**
 * DELETE /student/:id – delete a student by ID.
 */
export async function deleteStudentById(id: string) {
  const safeId = encodeURIComponent(id);
  const response = await api.delete(`/student/${safeId}`);
  return response.data;
}
