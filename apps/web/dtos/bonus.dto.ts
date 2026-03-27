export type BonusPaymentStatus = "paid" | "pending" | string;

export interface BonusListMeta {
  total: number;
  page: number;
  limit: number;
}

export interface BonusListItem {
  id: string;
  staffId: string;
  workType?: string | null;
  amount?: number | null;
  status?: BonusPaymentStatus | null;
  note?: string | null;
  month?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type BonusDetail = BonusListItem;

export interface BonusListResponse {
  data: BonusListItem[];
  meta: BonusListMeta;
}

export interface CreateBonusPayload {
  id: string;
  staffId: string;
  workType: string;
  month: string;
  amount?: number;
  status?: BonusPaymentStatus;
  note?: string;
}

export interface CreateMyBonusPayload {
  id: string;
  workType: string;
  month: string;
  amount?: number;
  note?: string;
}

export interface UpdateMyBonusPayload {
  id: string;
  workType?: string;
  month?: string;
  amount?: number;
  note?: string;
}

export interface UpdateBonusPayload {
  id: string;
  staffId?: string;
  workType?: string;
  month?: string;
  amount?: number;
  status?: BonusPaymentStatus;
  note?: string;
}
