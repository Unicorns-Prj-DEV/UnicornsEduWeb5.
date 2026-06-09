import { AttendanceStatus, PaymentStatus } from 'generated/enums';

export type AssistantCommissionScope = 'pending' | 'all' | 'month';

export interface AssistantCommissionListMetaDto {
  total: number;
  page: number;
  limit: number;
}

export interface AssistantManagedCustomerCareItemDto {
  customerCareStaffId: string;
  fullName: string;
  totalShareAmount: number;
  pendingShareAmount: number;
  paidShareAmount: number;
}

export interface AssistantManagedCustomerCareListDto {
  data: AssistantManagedCustomerCareItemDto[];
  meta: AssistantCommissionListMetaDto;
}

export interface AssistantManagedStudentItemDto {
  studentId: string;
  fullName: string;
  totalShareAmount: number;
  pendingShareAmount: number;
  paidShareAmount: number;
}

export interface AssistantManagedStudentListDto {
  data: AssistantManagedStudentItemDto[];
  meta: AssistantCommissionListMetaDto;
}

export interface AssistantSessionShareItemDto {
  attendanceId: string;
  sessionId: string;
  date: string;
  className: string | null;
  tuitionFee: number;
  shareRatePercent: number;
  shareAmount: number;
  attendanceStatus: AttendanceStatus;
  paymentStatus: PaymentStatus;
  customerCareStaffName: string;
}

export interface AssistantBulkPaymentStatusUpdateDto {
  attendanceIds: string[];
  paymentStatus: PaymentStatus;
}

export interface AssistantBulkPaymentStatusUpdateResultDto {
  assistantStaffId: string;
  requestedCount: number;
  updatedCount: number;
}
