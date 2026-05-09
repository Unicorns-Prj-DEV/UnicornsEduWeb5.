import type { StaffStatus } from "./staff.dto";

export type StudentStatus = "active" | "inactive";
export type StudentGender = "male" | "female";
export type StudentWalletTransactionType = "topup" | "loan" | "repayment" | "extend";

export interface StudentListMeta {
  total: number;
  page: number;
  limit: number;
}

export interface StudentClassItem {
  class: {
    id: string;
    name: string;
    status?: "running" | "ended" | null;
  };
  customTuitionPerSession?: number | null;
  customTuitionPackageTotal?: number | null;
  customTuitionPackageSession?: number | null;
  effectiveTuitionPerSession?: number | null;
  effectiveTuitionPackageTotal?: number | null;
  effectiveTuitionPackageSession?: number | null;
  tuitionPackageSource?: "custom" | "class" | "unset";
  totalAttendedSession?: number | null;
}

/** Item from GET /student list */
export interface StudentListItem {
  id: string;
  fullName: string;
  email?: string | null;
  accountBalance?: number | null;
  school?: string | null;
  province?: string | null;
  status?: StudentStatus;
  gender?: StudentGender;
  createdAt?: string;
  updatedAt?: string;
  studentClasses?: StudentClassItem[];
}

export interface StudentListResponse {
  data: StudentListItem[];
  meta: StudentListMeta;
}

/** Detail from GET /student/:id */
export interface StudentDetail extends StudentListItem {
  birthYear?: number | null;
  parentName?: string | null;
  parentPhone?: string | null;
  goal?: string | null;
  dropOutDate?: string | null;
  customerCare?: {
    staff: {
      id: string;
      fullName: string;
      roles: string[];
      status: StaffStatus;
    };
    profitPercent: number | null;
  } | null;
}

export interface StudentAssignableUser {
  id: string;
  email: string;
  accountHandle: string;
  province?: string | null;
  roleType: string;
  status: string;
  fullName?: string | null;
  hasStudentProfile: boolean;
  studentId?: string | null;
  hasStaffProfile: boolean;
  staffId?: string | null;
  isEligible: boolean;
  ineligibleReason?: string | null;
}

export interface StudentWalletTransaction {
  id: string;
  type: StudentWalletTransactionType;
  amount: number;
  note?: string | null;
  date?: string;
  createdAt: string;
}

export interface StudentExamScheduleItem {
  id: string;
  examDate: string;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StudentSelfClassItem = StudentClassItem;

/** Phản hồi POST /users/me/student-wallet-sepay-topup-order */
export interface StudentSePayTopUpOrderResponse {
  amount: number;
  transferNote: string;
  orderCode: string;
  qrCode?: string | null;
  qrCodeUrl?: string | null;
  orderId?: string | null;
  vaNumber?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  expiredAt?: string | null;
}

export interface StudentSelfDetail {
  id: string;
  fullName: string;
  email?: string | null;
  accountBalance?: number | null;
  school?: string | null;
  province?: string | null;
  status?: StudentStatus;
  gender?: StudentGender;
  createdAt?: string;
  updatedAt?: string;
  birthYear?: number | null;
  parentName?: string | null;
  parentPhone?: string | null;
  goal?: string | null;
  studentClasses?: StudentSelfClassItem[];
}

export interface UpdateStudentPayload {
  full_name?: string;
  email?: string;
  school?: string;
  province?: string;
  birth_year?: number;
  parent_name?: string;
  parent_phone?: string;
  status?: StudentStatus;
  gender?: StudentGender;
  goal?: string;
  drop_out_date?: string;
  customer_care_staff_id?: string | null;
  customer_care_profit_percent?: number | null;
}

export interface CreateStudentPayload {
  full_name: string;
  email?: string;
  school?: string;
  province?: string;
  birth_year?: number;
  parent_name?: string;
  parent_phone?: string;
  status?: StudentStatus;
  gender?: StudentGender;
  goal?: string;
  drop_out_date?: string;
  user_id: string;
}

export interface UpdateStudentAccountBalancePayload {
  student_id: string;
  amount: number;
}

export interface UpdateStudentClassesPayload {
  class_ids: string[];
}

export interface UpdateStudentExamSchedulesPayload {
  items: Array<{
    id?: string;
    examDate: string;
    note?: string | null;
  }>;
}

export interface UpdateMyStudentAccountBalancePayload {
  amount: number;
}
