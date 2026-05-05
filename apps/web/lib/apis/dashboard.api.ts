import {
  AdminDashboardDto,
  AdminDashboardFinancialDetail,
  AdminDashboardFinancialDetailRowKey,
  AdminDashboardStudentBalanceItem,
  AdminDashboardTopupHistoryItem,
} from "@/dtos/dashboard.dto";
import { api } from "../client";

export async function getAdminDashboard(params?: {
  month?: string;
  year?: string;
  alertLimit?: number;
  topClassLimit?: number;
}): Promise<AdminDashboardDto> {
  const response = await api.get<AdminDashboardDto>("/dashboard", {
    params: {
      ...(params?.month ? { month: params.month } : {}),
      ...(params?.year ? { year: params.year } : {}),
      ...(typeof params?.alertLimit === "number" ? { alertLimit: params.alertLimit } : {}),
      ...(typeof params?.topClassLimit === "number" ? { topClassLimit: params.topClassLimit } : {}),
    },
  });

  return response.data;
}

export async function getAdminTopupHistory(params?: {
  month?: string;
  year?: string;
  limit?: number;
}): Promise<AdminDashboardTopupHistoryItem[]> {
  const response = await api.get<AdminDashboardTopupHistoryItem[]>("/dashboard/topup-history", {
    params: {
      ...(params?.month ? { month: params.month } : {}),
      ...(params?.year ? { year: params.year } : {}),
      ...(typeof params?.limit === "number" ? { limit: params.limit } : {}),
    },
  });

  return response.data;
}

export async function getAdminStudentBalanceDetails(params?: {
  limit?: number;
  month?: string;
  year?: string;
}): Promise<AdminDashboardStudentBalanceItem[]> {
  const response = await api.get<AdminDashboardStudentBalanceItem[]>("/dashboard/student-balance-details", {
    params: {
      ...(typeof params?.limit === "number" ? { limit: params.limit } : {}),
      ...(params?.month ? { month: params.month } : {}),
      ...(params?.year ? { year: params.year } : {}),
    },
  });

  return response.data;
}

export async function getAdminDashboardFinancialDetail(params: {
  rowKey: AdminDashboardFinancialDetailRowKey;
  month?: string;
  year?: string;
  limit?: number;
}): Promise<AdminDashboardFinancialDetail> {
  const response = await api.get<AdminDashboardFinancialDetail>("/dashboard/financial-detail", {
    params: {
      rowKey: params.rowKey,
      ...(params.month ? { month: params.month } : {}),
      ...(params.year ? { year: params.year } : {}),
      ...(typeof params.limit === "number" ? { limit: params.limit } : {}),
    },
  });

  return response.data;
}
