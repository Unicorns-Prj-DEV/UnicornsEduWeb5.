export type SessionPaymentStatus = "paid" | "unpaid" | string;
export type SessionAttendanceStatus = "present" | "excused" | "absent";

export interface SessionClassRef {
  id: string;
  name: string;
}

export interface SessionTeacherRef {
  id: string;
  fullName?: string | null;
}

export interface SessionAttendanceItem {
  studentId: string;
  status: SessionAttendanceStatus;
  notes?: string | null;
  tuitionFee?: number | null;
}

export interface SessionMonthYearParams {
  month: string;
  year: string;
}

export interface SessionUnpaidSummaryParams {
  days?: number;
}

export interface SessionUnpaidSummaryItem {
  classId: string;
  className: string;
  totalAllowance: number | string;
}

export interface SessionCreatePayload {
  classId: string;
  teacherId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  notes?: string | null;
  /** Coefficient (e.g. 1.0, 1.5). Default 1.0. */
  coefficient?: number;
  /** Allowance amount (VNĐ). If omitted, uses class teacher custom allowance. */
  allowanceAmount?: number | null;
  attendance: SessionAttendanceItem[];
}

export interface SessionUpdatePayload {
  id?: string;
  classId?: string;
  teacherId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  notes?: string | null;
  teacherPaymentStatus?: string | null;
  coefficient?: number;
  allowanceAmount?: number | null;
  attendance?: SessionAttendanceItem[];
}

export interface SessionAttendanceRecord {
  studentId: string;
  status: SessionAttendanceStatus;
  notes?: string | null;
  tuitionFee?: number | null;
}

export interface SessionItem {
  id: string;
  classId: string;
  teacherId: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  teacherPaymentStatus?: SessionPaymentStatus | null;
  allowanceAmount?: number | null;
  tuitionFee?: number | null;
  /** Coefficient (e.g. 1.0, 1.5). */
  coefficient?: number | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  class?: SessionClassRef | null;
  teacher?: SessionTeacherRef | null;
  attendance?: SessionAttendanceRecord[] | null;
}
