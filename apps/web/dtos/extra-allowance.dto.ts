import type { StaffOption, StaffStatus } from "./staff.dto";
import type { StaffRole } from "./user.dto";

export type ExtraAllowanceStatus = "paid" | "pending";
export type ExtraAllowanceRoleType = StaffRole;
export type ExtraAllowanceUpsertMode = "create" | "edit";

export interface ExtraAllowanceListMeta {
  total: number;
  page: number;
  limit: number;
}

export interface ExtraAllowanceStaffSummary {
  id: string;
  fullName: string;
  status: StaffStatus;
  roles: string[];
}

export interface ExtraAllowanceBaseFields {
  staffId?: string;
  month?: string | null;
  amount?: number | null;
  status?: ExtraAllowanceStatus | null;
  note?: string | null;
  roleType?: ExtraAllowanceRoleType | null;
  staffRoles?: ExtraAllowanceRoleType[] | null;
  staff?: ExtraAllowanceStaffSummary | null;
}

export interface ExtraAllowanceListItem extends ExtraAllowanceBaseFields {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ExtraAllowanceDetailResponse = ExtraAllowanceListItem;

/** POST /users/me/staff-extra-allowances — communication role self-service */
export interface CreateMyCommunicationExtraAllowancePayload {
  id: string;
  month: string;
  amount?: number;
  note?: string;
}

export interface CreateExtraAllowancePayload {
  id: string;
  staffId: string;
  month: string;
  amount?: number;
  status?: ExtraAllowanceStatus;
  note?: string;
  roleType: ExtraAllowanceRoleType;
}

export interface UpdateExtraAllowancePayload {
  id: string;
  staffId?: string;
  month?: string;
  amount?: number;
  status?: ExtraAllowanceStatus;
  note?: string | null;
  roleType?: ExtraAllowanceRoleType;
}

export interface BulkUpdateExtraAllowanceStatusPayload {
  allowanceIds: string[];
  status: ExtraAllowanceStatus;
}

export interface BulkUpdateExtraAllowanceStatusResult {
  requestedCount: number;
  updatedCount: number;
}

export interface ExtraAllowanceListResponse {
  data: ExtraAllowanceListItem[];
  meta: ExtraAllowanceListMeta;
}

export interface SearchExtraAllowanceParams {
  page: number;
  limit: number;
  search?: string;
  year?: string;
  month?: string;
  roleType?: ExtraAllowanceRoleType;
  staffId?: string;
  status?: ExtraAllowanceStatus;
}

export type ExtraAllowanceFormStaffOption = StaffOption;
