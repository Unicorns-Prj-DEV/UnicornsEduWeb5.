import type {
  UserDetailWithStaff,
  UserListResponse,
  UpdateUserPayload,
} from "@/dtos/user.dto";
import { api } from "../client";

export interface GetUserListParams {
  page?: number;
  limit?: number;
  search?: string;
}

/** Danh sách user có phân trang (admin). */
export async function getUserList(
  params: GetUserListParams = {}
): Promise<UserListResponse> {
  const { page = 1, limit = 20 } = params;
  const response = await api.get<UserListResponse>("/users", {
    params: {
      page,
      limit,
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    },
  });
  const payload = response.data;
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    meta: payload?.meta ?? { total: 0, page: 1, limit },
  };
}

/** Chi tiết user (có staffInfo cho phân quyền). */
export async function getUserById(id: string): Promise<UserDetailWithStaff> {
  const safeId = encodeURIComponent(id);
  const response = await api.get<UserDetailWithStaff>(`/users/${safeId}`);
  return response.data;
}

/** Cập nhật user (roleType, status, ...). */
export async function updateUser(data: UpdateUserPayload): Promise<UserDetailWithStaff> {
  const response = await api.patch<UserDetailWithStaff>("/users", data);
  return response.data;
}
