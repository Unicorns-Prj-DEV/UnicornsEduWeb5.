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
  dateFrom?: string;
  dateTo?: string;
}): Promise<AdminDashboardDto> {
  const response = await api.get<AdminDashboardDto>("/dashboard", {
    params: {
      ...(params?.month ? { month: params.month } : {}),
      ...(params?.year ? { year: params.year } : {}),
      ...(typeof params?.alertLimit === "number" ? { alertLimit: params.alertLimit } : {}),
      ...(typeof params?.topClassLimit === "number" ? { topClassLimit: params.topClassLimit } : {}),
      ...(params?.dateFrom ? { dateFrom: params.dateFrom } : {}),
      ...(params?.dateTo ? { dateTo: params.dateTo } : {}),
    },
  });

  return response.data;
}

export async function getAdminTopupHistory(params?: {
  month?: string;
  year?: string;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<AdminDashboardTopupHistoryItem[]> {
  const response = await api.get<AdminDashboardTopupHistoryItem[]>("/dashboard/topup-history", {
    params: {
      ...(params?.month ? { month: params.month } : {}),
      ...(params?.year ? { year: params.year } : {}),
      ...(typeof params?.limit === "number" ? { limit: params.limit } : {}),
      ...(params?.dateFrom ? { dateFrom: params.dateFrom } : {}),
      ...(params?.dateTo ? { dateTo: params.dateTo } : {}),
    },
  });

  return response.data;
}

export async function getAdminStudentBalanceDetails(params?: {
  limit?: number;
  month?: string;
  year?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<AdminDashboardStudentBalanceItem[]> {
  const response = await api.get<AdminDashboardStudentBalanceItem[]>("/dashboard/student-balance-details", {
    params: {
      ...(typeof params?.limit === "number" ? { limit: params.limit } : {}),
      ...(params?.month ? { month: params.month } : {}),
      ...(params?.year ? { year: params.year } : {}),
      ...(params?.dateFrom ? { dateFrom: params.dateFrom } : {}),
      ...(params?.dateTo ? { dateTo: params.dateTo } : {}),
    },
  });

  return response.data;
}

export async function getAdminDashboardFinancialDetail(params: {
  rowKey: AdminDashboardFinancialDetailRowKey;
  month?: string;
  year?: string;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<AdminDashboardFinancialDetail> {
  const response = await api.get<AdminDashboardFinancialDetail>("/dashboard/financial-detail", {
    params: {
      rowKey: params.rowKey,
      ...(params.month ? { month: params.month } : {}),
      ...(params.year ? { year: params.year } : {}),
      ...(typeof params.limit === "number" ? { limit: params.limit } : {}),
      ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
      ...(params.dateTo ? { dateTo: params.dateTo } : {}),
    },
  });

  return response.data;
}
