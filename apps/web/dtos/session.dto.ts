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
}

export interface SessionMonthYearParams {
  month: string;
  year: string;
}

export interface SessionCreatePayload {
  classId: string;
  teacherId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  notes?: string | null;
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
  attendance?: SessionAttendanceItem[];
}

export interface SessionAttendanceRecord {
  studentId: string;
  status: SessionAttendanceStatus;
  notes?: string | null;
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
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  class?: SessionClassRef | null;
  teacher?: SessionTeacherRef | null;
  attendance?: SessionAttendanceRecord[] | null;
}
