import type { StudentStatus } from "./student.dto";

/** One student in GET /customer-care/staff/:staffId/students */
export interface CustomerCareStudentItem {
  id: string;
  fullName: string;
  accountBalance: number;
  province: string | null;
  status: StudentStatus | null;
  classes: { id: string; name: string }[];
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
}
