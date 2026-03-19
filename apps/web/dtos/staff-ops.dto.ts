import type {
  ClassDetail,
  ClassListResponse,
  ClassScheduleItem,
  ClassStatus,
  ClassType,
} from "./class.dto";
import type {
  SessionAttendanceStatus,
  SessionItem,
  SessionMonthYearParams,
} from "./session.dto";

export type StaffOpsClassListResponse = ClassListResponse;
export type StaffOpsClassDetail = ClassDetail;
export type StaffOpsSessionList = SessionItem[];
export type StaffOpsSessionMonthYearParams = SessionMonthYearParams;

export interface StaffOpsCreateClassPayload {
  name: string;
  type?: ClassType;
  status?: ClassStatus;
  schedule?: ClassScheduleItem[];
}

export interface StaffOpsUpdateClassSchedulePayload {
  schedule: ClassScheduleItem[];
}

export interface StaffOpsSessionAttendancePayload {
  studentId: string;
  status: SessionAttendanceStatus;
  notes?: string | null;
}

export interface StaffOpsCreateSessionPayload {
  date: string;
  startTime?: string;
  endTime?: string;
  notes?: string | null;
  attendance: StaffOpsSessionAttendancePayload[];
}

export interface StaffOpsUpdateSessionPayload {
  date?: string;
  startTime?: string;
  endTime?: string;
  notes?: string | null;
  attendance?: StaffOpsSessionAttendancePayload[];
}
