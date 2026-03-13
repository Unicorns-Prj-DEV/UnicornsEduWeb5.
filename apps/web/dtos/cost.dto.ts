export type CostStatus = "paid" | "pending";

export interface CostListMeta {
  total: number;
  page: number;
  limit: number;
}

export interface CostListItem {
  id: string;
  month?: string | null;
  category?: string | null;
  amount?: number | null;
  date?: string | null;
  status?: CostStatus | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CostListResponse {
  data: CostListItem[];
  meta: CostListMeta;
}
