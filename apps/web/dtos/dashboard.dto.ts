export interface AdminDashboardPeriod {
  month: string;
  year: string;
  monthLabel: string;
}

export interface AdminDashboardSummary {
  activeClasses: number;
  activeStudents: number;
  monthlyRevenue: number;
  monthlyExpense: number;
  monthlyProfit: number;
  pendingCollectionTotal: number;
  pendingPayrollTotal: number;
  expiringStudentsCount: number;
  debtStudentsCount: number;
  unpaidStaffCount: number;
  totalAlerts: number;
}

export interface AdminDashboardTrendPoint {
  monthKey: string;
  month: string;
  revenue: number;
  expense: number;
  profit: number;
}

export type AdminDashboardBreakdownKey =
  | "revenue"
  | "teacherCost"
  | "customerCareCost"
  | "lessonCost"
  | "bonusCost"
  | "extraAllowanceCost"
  | "operatingCost";

export interface AdminDashboardBreakdownItem {
  key: AdminDashboardBreakdownKey;
  label: string;
  kind: "revenue" | "expense";
  amount: number;
}

export interface AdminDashboardActionAlert {
  type: "Sắp hết tiền" | "Chưa thu" | "Nhân sự chưa thanh toán";
  subject: string;
  owner: string | null;
  due: string;
  amount: number;
  severity: "warning" | "destructive" | "info";
}

export interface AdminDashboardClassPerformance {
  classId: string;
  name: string;
  students: number;
  revenue: number;
  profit: number;
  balanceRisk: number;
}

export interface AdminDashboardYearlySummary {
  quarter: string;
  classes: number;
  revenue: number;
  expense: number;
  profit: number;
}

export interface AdminDashboardDto {
  period: AdminDashboardPeriod;
  summary: AdminDashboardSummary;
  revenueProfitTrend: AdminDashboardTrendPoint[];
  breakdown: AdminDashboardBreakdownItem[];
  actionAlerts: AdminDashboardActionAlert[];
  classPerformance: AdminDashboardClassPerformance[];
  yearlySummary: AdminDashboardYearlySummary[];
}
