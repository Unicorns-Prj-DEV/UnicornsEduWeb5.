export type ActionHistoryActionType = "create" | "update" | "delete";

export interface ActionHistoryChangedField {
  old: unknown;
  new: unknown;
}

export type ActionHistoryChangedFields = Record<string, ActionHistoryChangedField>;

export interface ActionHistoryListParams {
  page?: number;
  limit?: number;
  entityType?: string;
  actionType?: ActionHistoryActionType;
  entityId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ActionHistoryListItem {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  actionType?: ActionHistoryActionType | null;
  changedFields?: ActionHistoryChangedFields | null;
  createdAt: string;
  description?: string | null;
}

export interface ActionHistoryDetail extends ActionHistoryListItem {
  beforeValue?: unknown;
  afterValue?: unknown;
}

export interface ActionHistoryListMeta {
  total: number;
  page: number;
  limit: number;
}

export interface ActionHistoryListResponse {
  data: ActionHistoryListItem[];
  meta: ActionHistoryListMeta;
}
