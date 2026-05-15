import type { StudentStatus } from "./student.dto";

export type CustomerCarePaymentStatus = "pending" | "paid";

/** One student in GET /customer-care/staff/:staffId/students */
export interface CustomerCareStudentItem {
  id: string;
  fullName: string;
  accountBalance: number;
  province: string | null;
  status: StudentStatus | null;
  classes: { id: string; name: string }[];
  recentTopUpTotalLast21Days: number;
  recentTopUpMeetsThreshold: boolean;
}

export interface CustomerCareStudentListMeta {
  total: number;
  page: number;
  limit: number;
}

export interface CustomerCareStudentListResponse {
  data: CustomerCareStudentItem[];
  meta: CustomerCareStudentListMeta;
}

export interface CustomerCareTopUpHistoryItem {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  note?: string | null;
  date?: string | null;
  createdAt: string;
}

export interface CustomerCareTopUpHistoryListResponse {
  data: CustomerCareTopUpHistoryItem[];
  meta: CustomerCareStudentListMeta;
}

/** One row in GET /customer-care/staff/:staffId/commissions */
export interface CustomerCareCommissionItem {
  studentId: string;
  fullName: string;
  totalCommission: number;
}

/** One session commission in GET .../students/:studentId/session-commissions */
export interface CustomerCareSessionCommissionItem {
  sessionId: string;
  date: string;
  className: string | null;
  tuitionFee: number;
  customerCareCoef: number;
  commission: number;
  paymentStatus: CustomerCarePaymentStatus;
}
