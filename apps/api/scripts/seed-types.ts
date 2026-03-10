/**
 * In-memory data shapes for seed pipeline (aligned with Prisma schema).
 * Used for CSV transform → anonymize → preview → augment → sync.
 */

export type UserRole = 'admin' | 'staff' | 'student' | 'guest';
export type UserStatus = 'active' | 'inactive' | 'pending';
export type StaffStatus = 'active' | 'inactive';
export type StudentStatus = 'active' | 'inactive';
export type Gender = 'male' | 'female';
export type ClassStatus = 'running' | 'ended';
export type ClassType = 'vip' | 'basic' | 'advance' | 'hardcore';
export type AttendanceStatus = 'present' | 'excused' | 'absent';
export type WalletTransactionType = 'topup' | 'loan' | 'repayment' | 'extend';
export type LessonTaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type LessonTaskPriority = 'low' | 'medium' | 'high';
export type PaymentStatus = 'paid' | 'pending';

export interface StaffInfoRow {
  id: string;
  fullName: string;
  birthDate?: Date | null;
  university?: string | null;
  highSchool?: string | null;
  specialization?: string | null;
  bankAccount?: string | null;
  bankQrLink?: string | null;
  roles: unknown;
  status: StaffStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StudentInfoRow {
  id: string;
  fullName: string;
  email?: string | null;
  school?: string | null;
  province?: string | null;
  birthYear?: number | null;
  parentName?: string | null;
  parentPhone?: string | null;
  status: StudentStatus;
  gender: Gender;
  goal?: string | null;
  dropOutDate?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserRow {
  id: string;
  email: string;
  phone?: string | null;
  passwordHash: string;
  name?: string | null;
  roleType: UserRole;
  province?: string | null;
  status: UserStatus;
  linkId?: string | null;
  accountHandle?: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  refreshToken?: string | null;
  studentId?: string | null;
  staffId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClassRow {
  id: string;
  name: string;
  type: ClassType;
  status: ClassStatus;
  maxStudents: number;
  allowancePerSessionPerStudent: number;
  maxAllowancePerSession?: number | null;
  scaleAmount?: number | null;
  schedule: unknown;
  studentTuitionPerSession?: number | null;
  tuitionPackageTotal?: number | null;
  tuitionPackageSession?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClassTeacherRow {
  id: string;
  classId: string;
  teacherId: string;
  customAllowance?: number | null;
  status?: string | null;
  createdAt?: Date;
}

export interface StudentClassRow {
  id: string;
  studentId: string;
  classId: string;
  customStudentTuitionPerSession?: number | null;
  customTuitionPackageTotal?: number | null;
  customTuitionPackageSession?: number | null;
  totalAttendedSession?: number | null;
  createdAt?: Date;
}

export interface SessionRow {
  id: string;
  teacherId: string;
  classId: string;
  allowanceAmount?: number | null;
  teacherPaymentStatus: string;
  date: Date;
  startTime?: Date | null;
  endTime?: Date | null;
  coefficient: number;
  notes?: string | null;
  tuitionFee?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AttendanceRow {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  notes?: string | null;
  createdAt?: Date;
}

export interface BonusRow {
  id: string;
  staffId: string;
  workType: string;
  amount: number;
  status: PaymentStatus;
  note?: string | null;
  month: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WalletTransactionsHistoryRow {
  id: string;
  studentId: string;
  type: WalletTransactionType;
  amount: number;
  note?: string | null;
  date: Date;
  customerCareStaffId: string;
  customerCareProfitPercent?: number | null;
  customerCarePaymentStatus?: boolean | null;
}

export interface CustomerCareServiceRow {
  id: string;
  studentId: string;
  staffId: string;
  profitPercent?: number | null;
}

export interface StaffMonthlyStatRow {
  id: string;
  staffId: string;
  month: string;
  classesTotalMonth?: number | null;
  classesTotalPaid?: number | null;
  classesTotalUnpaid?: number | null;
  workItemsTotalMonth?: number | null;
  workItemsTotalPaid?: number | null;
  workItemsTotalUnpaid?: number | null;
  bonusesTotalMonth?: number | null;
  bonusesTotalPaid?: number | null;
  bonusesTotalUnpaid?: number | null;
  totalMonthAll?: number | null;
  totalPaidAll?: number | null;
  totalUnpaidAll?: number | null;
  calculatedAt?: Date | null;
}

export interface DashboardCacheRow {
  cacheKey: string;
  cacheType: string;
  data: unknown;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CostExtendRow {
  id: string;
  month?: string | null;
  category?: string | null;
  amount?: number | null;
  date?: Date | null;
  status?: PaymentStatus | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClassSurveyRow {
  id: string;
  classId?: string | null;
  testNumber: number;
  teacherId?: string | null;
  reportDate: Date;
  content: string;
  createdAt?: Date | null;
}

export interface ActionHistoryRow {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  actionType?: string | null;
  beforeValue?: unknown;
  afterValue?: unknown;
  changedFields?: unknown;
  createdAt?: Date;
  description?: string | null;
}

export interface DocumentRow {
  id: string;
  title: string;
  description?: string | null;
  fileUrl: string;
  tags: unknown;
  uploadedBy?: string | null;
}

export interface LessonTaskRow {
  id: string;
  title?: string | null;
  description?: string | null;
  status: LessonTaskStatus;
  priority: LessonTaskPriority;
  dueDate?: Date | null;
  createdBy?: string | null;
}

export interface StaffLessonTaskRow {
  id: string;
  staffId: string;
  lessonTaskId: string;
}

export interface LessonResourceRow {
  id: string;
  resourceLink: string;
  title?: string | null;
  description?: string | null;
  tags: unknown;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LessonOutputRow {
  id: string;
  tag?: string | null;
  level?: string | null;
  lessonName: string;
  originalTitle?: string | null;
  source?: string | null;
  originalLink?: string | null;
  cost: number;
  date: Date;
  staffPaymentStatus: PaymentStatus;
  contestUploaded?: string | null;
  link?: string | null;
  staffId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** All table names in dependency order for insert */
export const TABLE_ORDER = [
  'staff_info',
  'student_info',
  'users',
  'classes',
  'class_teachers',
  'student_classes',
  'sessions',
  'attendance',
  'bonuses',
  'wallet_transactions_history',
  'customer_care_service',
  'staff_monthly_stats',
  'dashboard_cache',
  'cost_extend',
  'class_surveys',
  'action_history',
  'documents',
  'lesson_task',
  'staff_lesson_task',
  'lesson_resources',
  'lesson_outputs',
] as const;

export interface SeedData {
  staffInfo: StaffInfoRow[];
  studentInfo: StudentInfoRow[];
  users: UserRow[];
  classes: ClassRow[];
  classTeachers: ClassTeacherRow[];
  studentClasses: StudentClassRow[];
  sessions: SessionRow[];
  attendance: AttendanceRow[];
  bonuses: BonusRow[];
  walletTransactionsHistory: WalletTransactionsHistoryRow[];
  customerCareService: CustomerCareServiceRow[];
  staffMonthlyStats: StaffMonthlyStatRow[];
  dashboardCache: DashboardCacheRow[];
  costExtend: CostExtendRow[];
  classSurveys: ClassSurveyRow[];
  actionHistory: ActionHistoryRow[];
  documents: DocumentRow[];
  lessonTask: LessonTaskRow[];
  staffLessonTask: StaffLessonTaskRow[];
  lessonResources: LessonResourceRow[];
  lessonOutputs: LessonOutputRow[];
}
