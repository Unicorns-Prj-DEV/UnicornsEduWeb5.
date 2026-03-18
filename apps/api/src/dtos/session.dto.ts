import { AttendanceCreateDto, AttendanceUpdateDto } from './attendance.dto';

export interface SessionCreateDto {
  classId: string;
  teacherId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  notes?: string | null;
  /** Coefficient for this session (e.g. 1.0, 1.5). Default 1.0. */
  coefficient?: number;
  /** Allowance amount (VNĐ) for this session. If omitted, uses class teacher custom allowance. */
  allowanceAmount?: number | null;
  attendance: AttendanceCreateDto[];
}

export interface SessionUpdateDto {
  id?: string;
  classId?: string;
  teacherId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  notes?: string | null;
  teacherPaymentStatus?: string | null;
  /** Coefficient for this session (e.g. 1.0, 1.5). */
  coefficient?: number;
  /** Allowance amount (VNĐ) for this session. */
  allowanceAmount?: number | null;
  attendance?: AttendanceUpdateDto[];
}
