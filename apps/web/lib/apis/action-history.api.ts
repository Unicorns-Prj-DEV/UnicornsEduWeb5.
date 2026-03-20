import type {
  ActionHistoryDetail,
  ActionHistoryListItem,
  ActionHistoryListParams,
  ActionHistoryListResponse,
} from "@/dtos/action-history.dto";
import { api } from "../client";

function deepCloneAuditValue<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepCloneAuditValue(item)) as T;
  }

  if (value && typeof value === "object") {
    const cloned: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      cloned[key] = deepCloneAuditValue(nestedValue);
    }

    return cloned as T;
  }

  return value;
}

function cloneHistoryListItem(item: ActionHistoryListItem): ActionHistoryListItem {
  return deepCloneAuditValue(item);
}

function cloneHistoryDetail(detail: ActionHistoryDetail): ActionHistoryDetail {
  return deepCloneAuditValue(detail);
}

function buildListParams(params: ActionHistoryListParams) {
  return {
    ...(params.page ? { page: params.page } : {}),
    ...(params.limit ? { limit: params.limit } : {}),
    ...(params.entityType?.trim() ? { entityType: params.entityType.trim() } : {}),
    ...(params.actionType ? { actionType: params.actionType } : {}),
    ...(params.entityId?.trim() ? { entityId: params.entityId.trim() } : {}),
    ...(params.userId?.trim() ? { userId: params.userId.trim() } : {}),
    ...(params.startDate ? { startDate: params.startDate } : {}),
    ...(params.endDate ? { endDate: params.endDate } : {}),
  };
}

export async function getActionHistoryList(
  params: ActionHistoryListParams = {},
): Promise<ActionHistoryListResponse> {
  const response = await api.get<ActionHistoryListResponse>("/action-history", {
    params: buildListParams(params),
  });
  const payload = response.data;

  return {
    data: Array.isArray(payload?.data) ? payload.data.map(cloneHistoryListItem) : [],
    meta: payload?.meta ?? {
      total: 0,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  };
}

export async function getActionHistoryById(
  id: string,
): Promise<ActionHistoryDetail> {
  const safeId = encodeURIComponent(id);
  const response = await api.get<ActionHistoryDetail>(`/action-history/${safeId}`);
  return cloneHistoryDetail(response.data);
}
