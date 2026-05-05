export interface AdminDashboardPeriod {
  month: string;
  year: string;
  /** Human-readable label; in range mode this is "dateFrom – dateTo". */
  monthLabel: string;
  viewMode?: "month" | "range";
  dateFrom?: string;
  dateTo?: string;
}

export interface AdminDashboardSummary {
  activeClasses: number;
  activeStudents: number;
  monthlyTopupTotal: number;
  totalLearnedTuition: number;
  monthlyRevenue: number;
  monthlyExpense: number;
  monthlyProfit: number;
  prepaidTuitionTotal: number;
  pendingCollectionTotal: number;
  pendingPayrollTotal: number;
  expiringStudentsCount: number;
  debtStudentsCount: number;
  unpaidStaffCount: number;
  totalAlerts: number;
}

export interface AdminDashboardTrendPoint {
  monthKey: string;
  month: string;
  revenue: number;
  expense: number;
  profit: number;
}

export type AdminDashboardBreakdownKey =
  | "revenue"
  | "teacherCost"
  | "customerCareCost"
  | "lessonCost"
  | "bonusCost"
  | "extraAllowanceCost"
  | "operatingCost";

export interface AdminDashboardBreakdownItem {
  key: AdminDashboardBreakdownKey;
  label: string;
  kind: "revenue" | "expense";
  amount: number;
}

export interface AdminDashboardActionAlert {
  type: "Sắp hết tiền" | "Chưa thu" | "Nhân sự chưa thanh toán" | "Lớp cảnh báo";
  subject: string;
  owner: string | null;
  due: string;
  amount: number;
  severity: "warning" | "destructive" | "info";
  targetType: "student" | "staff" | "class";
  targetId: string;
}

export interface AdminDashboardClassPerformance {
  classId: string;
  name: string;
  students: number;
  revenue: number;
  profit: number;
  balanceRisk: number;
}

export interface AdminDashboardYearlySummary {
  quarter: string;
  classes: number;
  revenue: number;
  expense: number;
  profit: number;
}

export interface AdminDashboardTopupHistoryItem {
  id: string;
  dateTime: string;
  studentName: string;
  amount: number;
  note: string;
  cumulativeBefore: number;
  cumulativeAfter: number;
}

export interface AdminDashboardStudentBalanceItem {
  studentId: string;
  studentName: string;
  className: string;
  balance: number;
}

export type AdminDashboardFinancialDetailRowKey =
  | "topup"
  | "revenue"
  | "prepaid"
  | "uncollected"
  | "pending-payroll"
  | "personnel-cost"
  | "other-cost"
  | "profit"
  | "total-in";

export interface AdminDashboardFinancialDetailSource {
  key: string;
  label: string;
  amount: number;
  note: string;
  tone: "positive" | "negative" | "neutral";
}

export interface AdminDashboardFinancialDetailItem {
  id: string;
  label: string;
  secondaryLabel: string | null;
  amount: number;
  note: string | null;
}

export interface AdminDashboardFinancialDetail {
  rowKey: AdminDashboardFinancialDetailRowKey;
  title: string;
  description: string;
  amount: number;
  sources: AdminDashboardFinancialDetailSource[];
  items: AdminDashboardFinancialDetailItem[];
  emptyState: string;
}

export interface AdminDashboardDto {
  period: AdminDashboardPeriod;
  summary: AdminDashboardSummary;
  revenueProfitTrend: AdminDashboardTrendPoint[];
  breakdown: AdminDashboardBreakdownItem[];
  actionAlerts: AdminDashboardActionAlert[];
  classPerformance: AdminDashboardClassPerformance[];
  yearlySummary: AdminDashboardYearlySummary[];
}

export interface StaffDashboardClassItem {
  id: string;
  name: string;
  studentCount: number;
  scheduleCount: number;
  surveyCount: number;
}

export interface StaffDashboardClassAlertItem {
  classId: string;
  className: string;
  reason: string;
  missingSchedule: boolean;
  missingSurvey: boolean;
  latestRequiredSurveyTestNumber: number | null;
  latestClassSurveyTestNumber: number | null;
}

export interface StaffDashboardTodaySessionItem {
  sessionId: string;
  classId: string;
  className: string;
  startTime: string | null;
  endTime: string | null;
  attendanceCount: number;
  teacherPaymentStatus: string | null;
}

export interface StaffDashboardTeacherSection {
  assignedClasses: StaffDashboardClassItem[];
  missingScheduleOrSurvey: StaffDashboardClassAlertItem[];
  todaySessions: StaffDashboardTodaySessionItem[];
}

export interface StaffDashboardTaskItem {
  taskId: string;
  title: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  responsibleName: string | null;
  assigneeNames: string[];
}

export interface StaffDashboardLessonPlanSection {
  totalTaskCount: number;
  completedTaskCount: number;
  remainingTaskCount: number;
  openTasks: StaffDashboardTaskItem[];
}

export interface StaffDashboardLessonPlanHeadTotals {
  totalOutputs: number;
  newOutputsThisMonth: number;
  newOutputsThisWeek: number;
}

export interface StaffDashboardLessonPlanHeadSection {
  incompleteTasks: StaffDashboardTaskItem[];
  lessonOutputTotals: StaffDashboardLessonPlanHeadTotals;
}

export interface StaffDashboardSystemSummary {
  activeClasses: number;
  activeStudents: number;
  activeTeachers: number;
}

export interface StaffDashboardCustomerCarePortfolioItem {
  staffId: string;
  staffName: string;
  activeStudentCount: number;
  learnedTuitionTotal: number;
  topupTotal: number;
}

export interface StaffDashboardAssistantSection {
  actionAlerts: AdminDashboardActionAlert[];
  systemSummary: StaffDashboardSystemSummary;
  customerCarePortfolios: StaffDashboardCustomerCarePortfolioItem[];
}

export interface StaffDashboardStudentAlertItem {
  studentId: string;
  studentName: string;
  classNames: string;
  accountBalance: number;
  referenceTuition: number | null;
  dueLabel: string;
}

export interface StaffDashboardCustomerCareSection {
  newStudentsThisMonth: number;
  droppedStudentsThisMonth: number;
  activeStudentsCount: number;
  learnedTuitionTotal: number;
  topupTotal: number;
  lowBalanceStudents: StaffDashboardStudentAlertItem[];
  debtStudents: StaffDashboardStudentAlertItem[];
}

export interface StaffDashboardUnpaidStaffItem {
  staffId: string;
  staffName: string;
  sessionAmount: number;
  bonusAmount: number;
  customerCareAmount: number;
  lessonAmount: number;
  extraAllowanceAmount: number;
  totalUnpaid: number;
}

export interface StaffDashboardFinancialOverview {
  period: AdminDashboardPeriod;
  summary: AdminDashboardSummary;
  breakdown: AdminDashboardBreakdownItem[];
}

export interface StaffDashboardAccountantSection {
  unpaidStaff: StaffDashboardUnpaidStaffItem[];
  financialOverview: StaffDashboardFinancialOverview;
}

export interface StaffDashboardDto {
  teacher?: StaffDashboardTeacherSection;
  lessonPlan?: StaffDashboardLessonPlanSection;
  lessonPlanHead?: StaffDashboardLessonPlanHeadSection;
  assistant?: StaffDashboardAssistantSection;
  customerCare?: StaffDashboardCustomerCareSection;
  accountant?: StaffDashboardAccountantSection;
}
