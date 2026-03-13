import { api } from "../client";

export type ClassStatus = "running" | "ended";

/** Phân loại lớp (ClassType trong DB) */
export type ClassType = "vip" | "basic" | "advance" | "hardcore";

export interface ClassListItem {
  id: string;
  name: string;
  status: ClassStatus;
  teachers?: Array<{ id: string; fullName?: string | null }>;
}

export interface ClassListMeta {
  total: number;
  page: number;
  limit: number;
}

export interface ClassListResponse {
  data: ClassListItem[];
  meta: ClassListMeta;
}

/**
 * GET /classes – list classes (paginated).
 * When backend is ready, replace the mock below with real api.get("/classes", { params }).
 */
export async function getClasses(params: {
  page: number;
  limit: number;
  search?: string;
  status?: ClassStatus;
  type?: ClassType;
  teacher?: string;
}): Promise<ClassListResponse> {
  try {
    const response = await api.get<ClassListResponse>("/classes", {
      params: {
        page: params.page,
        limit: params.limit,
        ...(params.search ? { search: params.search } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.type ? { type: params.type } : {}),
        ...(params.teacher ? { teacher: params.teacher } : {}),
      },
    });
    const payload = response.data;
    return {
      data: Array.isArray(payload?.data) ? payload.data : [],
      meta: {
        total: payload?.meta?.total ?? 0,
        page: payload?.meta?.page ?? params.page,
        limit: payload?.meta?.limit ?? params.limit,
      },
    };
  } catch {
    return {
      data: [],
      meta: { total: 0, page: params.page, limit: params.limit },
    };
  }
}
