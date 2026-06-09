import type {
  CustomerCareBulkPaymentStatusUpdatePayload,
  CustomerCareBulkPaymentStatusUpdateResult,
  CustomerCareCommissionListParams,
  CustomerCarePaymentStatus,
  CustomerCareStudentListResponse,
  CustomerCareCommissionItem,
  CustomerCareSessionCommissionItem,
  CustomerCareTopUpHistoryListResponse,
} from "@/dtos/customer-care.dto";
import { api } from "../client";

function normalizeCustomerCarePaymentStatus(
  value: string | null | undefined,
): CustomerCarePaymentStatus {
  return value === "paid" ? "paid" : "pending";
}

export async function getCustomerCareStudents(
  staffId: string,
  params: { page?: number; limit?: number } = {},
): Promise<CustomerCareStudentListResponse> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const res = await api.get<CustomerCareStudentListResponse>(
    `/customer-care/staff/${encodeURIComponent(staffId)}/students`,
    { params: { page, limit } },
  );
  const payload = res.data;
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    meta: {
      total: payload?.meta?.total ?? 0,
      page: payload?.meta?.page ?? page,
      limit: payload?.meta?.limit ?? limit,
    },
  };
}

export async function getCustomerCareTopUpHistory(
  staffId: string,
  params: { page?: number; limit?: number } = {},
): Promise<CustomerCareTopUpHistoryListResponse> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const res = await api.get<CustomerCareTopUpHistoryListResponse>(
    `/customer-care/staff/${encodeURIComponent(staffId)}/topup-history`,
    { params: { page, limit } },
  );
  const payload = res.data;
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    meta: {
      total: payload?.meta?.total ?? 0,
      page: payload?.meta?.page ?? page,
      limit: payload?.meta?.limit ?? limit,
    },
  };
}

export async function getCustomerCareCommissions(
  staffId: string,
  params: CustomerCareCommissionListParams = {},
): Promise<CustomerCareCommissionItem[]> {
  const res = await api.get<CustomerCareCommissionItem[]>(
    `/customer-care/staff/${encodeURIComponent(staffId)}/commissions`,
    { params },
  );
  return (res.data ?? []).map((item) => ({
    ...item,
    pendingCommission: item.pendingCommission ?? 0,
    paidCommission: item.paidCommission ?? 0,
  }));
}

export async function getCustomerCareSessionCommissions(
  staffId: string,
  studentId: string,
  params: CustomerCareCommissionListParams = {},
): Promise<CustomerCareSessionCommissionItem[]> {
  const res = await api.get<CustomerCareSessionCommissionItem[]>(
    `/customer-care/staff/${encodeURIComponent(staffId)}/students/${encodeURIComponent(studentId)}/session-commissions`,
    { params },
  );
  return (res.data ?? []).map((item) => ({
    ...item,
    paymentStatus: normalizeCustomerCarePaymentStatus(item.paymentStatus),
  }));
}

export async function bulkUpdateCustomerCarePaymentStatus(
  staffId: string,
  payload: CustomerCareBulkPaymentStatusUpdatePayload,
): Promise<CustomerCareBulkPaymentStatusUpdateResult> {
  const res = await api.patch<CustomerCareBulkPaymentStatusUpdateResult>(
    `/customer-care/staff/${encodeURIComponent(staffId)}/payment-status/bulk`,
    payload,
  );
  return res.data;
}
