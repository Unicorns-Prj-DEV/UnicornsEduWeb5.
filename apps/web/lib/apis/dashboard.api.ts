import { AdminDashboardDto } from "@/dtos/dashboard.dto";
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
