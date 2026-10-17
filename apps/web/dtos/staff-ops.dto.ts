import type {
  ClassDetail,
  ClassListResponse,
  ClassScheduleItem,
  ClassStatus,
} from "./class.dto";
import type {
  AttendanceReviewFields,
  SessionAttendanceStatus,
  SessionItem,
  SessionMonthYearParams,
  SessionReviewFields,
} from "./session.dto";

export type StaffOpsClassListResponse = ClassListResponse;
export type StaffOpsClassDetail = ClassDetail;
export type StaffOpsSessionList = SessionItem[];
export type StaffOpsSessionMonthYearParams = SessionMonthYearParams;

export interface StaffOpsCreateClassPayload {
  name: string;
  course_id?: string;
  status?: ClassStatus;
  schedule?: ClassScheduleItem[];
}

export interface StaffOpsUpdateClassSchedulePayload {
  schedule: ClassScheduleItem[];
  /** Id các slot cần xoá tường minh (soft-delete). Gia sư chỉ được liệt kê id slot của chính mình. */
  removedEntryIds?: string[];
  /** `updatedAt` của lớp lúc client tải dữ liệu — dùng để bật optimistic lock. */
  expectedUpdatedAt?: string;
}

export interface StaffOpsSessionAttendancePayload
  extends AttendanceReviewFields {
  studentId: string;
  status: SessionAttendanceStatus;
  notes?: string | null;
}

export interface StaffOpsCreateSessionPayload extends SessionReviewFields {
  date: string;
  startTime?: string;
  endTime?: string;
  notes?: string | null;
  lessonContent?: string | null;
  homework?: string | null;
  tutorial?: string | null;
  recordingUrl?: string | null;
  coefficient?: number;
  attendance?: StaffOpsSessionAttendancePayload[];
}

export interface StaffOpsUpdateSessionPayload extends SessionReviewFields {
  date?: string;
  startTime?: string;
  endTime?: string;
  notes?: string | null;
  lessonContent?: string | null;
  homework?: string | null;
  tutorial?: string | null;
  recordingUrl?: string | null;
  coefficient?: number;
  attendance?: StaffOpsSessionAttendancePayload[];
}
