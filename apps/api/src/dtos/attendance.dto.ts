import { AttendanceStatus } from 'generated/enums';

export interface AttendanceCreateDto {
  studentId: string;
  status: AttendanceStatus;
  notes?: string | null;
  tuitionFee?: number | null;
}

export interface AttendanceUpdateDto {
  studentId: string;
  status: AttendanceStatus;
  notes?: string | null;
  tuitionFee?: number | null;
}
