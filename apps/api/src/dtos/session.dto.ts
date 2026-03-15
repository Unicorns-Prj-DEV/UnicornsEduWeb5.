import { AttendanceCreateDto, AttendanceUpdateDto } from './attendance.dto';

export interface SessionCreateDto {
  classId: string;
  teacherId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  notes?: string | null;
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
  attendance?: AttendanceUpdateDto[];
}
