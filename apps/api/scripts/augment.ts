/**
 * Data augmentation: fill each table up to SEED_TARGET_ROWS with random data.
 * Keeps FK consistency by only referencing existing IDs.
 */
import { faker } from '@faker-js/faker';
import type {
  SeedData,
  StaffInfoRow,
  StudentInfoRow,
  UserRow,
  ClassRow,
  ClassTeacherRow,
  StudentClassRow,
  SessionRow,
  AttendanceRow,
  BonusRow,
  WalletTransactionsHistoryRow,
  CustomerCareServiceRow,
  StaffMonthlyStatRow,
  DashboardCacheRow,
  CostExtendRow,
  ClassSurveyRow,
  ActionHistoryRow,
  DocumentRow,
  LessonTaskRow,
  StaffLessonTaskRow,
  LessonResourceRow,
  LessonOutputRow,
} from './seed-types';

const uuid = () => faker.string.uuid();

function pick<T>(arr: T[]): T {
  return arr[faker.number.int({ min: 0, max: arr.length - 1 })];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export function augmentStaffInfo(existing: StaffInfoRow[], target: number): StaffInfoRow[] {
  const out = [...existing];
  while (out.length < target) {
    out.push({
      id: uuid(),
      fullName: faker.person.fullName(),
      birthDate: faker.date.past({ years: 30 }),
      university: faker.company.name(),
      highSchool: faker.company.name(),
      specialization: faker.person.jobTitle(),
      bankAccount: faker.finance.accountNumber(),
      bankQrLink: null,
      roles: [],
      status: faker.helpers.arrayElement(['active', 'inactive']),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return out;
}

export function augmentStudentInfo(existing: StudentInfoRow[], target: number): StudentInfoRow[] {
  const out = [...existing];
  while (out.length < target) {
    out.push({
      id: uuid(),
      fullName: faker.person.fullName(),
      email: faker.internet.email(),
      school: faker.company.name(),
      province: faker.location.state(),
      birthYear: faker.number.int({ min: 2005, max: 2015 }),
      parentName: faker.person.fullName(),
      parentPhone: faker.phone.number(),
      status: faker.helpers.arrayElement(['active', 'inactive']),
      gender: faker.helpers.arrayElement(['male', 'female']),
      goal: faker.lorem.sentence(),
      dropOutDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return out;
}

export function augmentUsers(
  existing: UserRow[],
  staffIds: string[],
  studentIds: string[],
  target: number,
  defaultPasswordHash: string
): UserRow[] {
  const out = [...existing];
  const usedEmails = new Set(existing.map((u) => u.email));
  while (out.length < target) {
    let email = faker.internet.email();
    while (usedEmails.has(email)) email = faker.internet.email();
    usedEmails.add(email);
    const role = faker.helpers.arrayElement(['admin', 'staff', 'student', 'guest'] as const);
    const staffId = staffIds.length ? pick(staffIds) : null;
    const studentId = studentIds.length ? pick(studentIds) : null;
    out.push({
      id: uuid(),
      email,
      phone: faker.phone.number(),
      passwordHash: defaultPasswordHash,
      name: faker.person.fullName(),
      roleType: role,
      province: faker.location.state(),
      status: faker.helpers.arrayElement(['active', 'inactive', 'pending'] as const),
      linkId: null,
      accountHandle: faker.internet.userName(),
      emailVerified: faker.datatype.boolean(),
      phoneVerified: faker.datatype.boolean(),
      refreshToken: null,
      studentId: role === 'student' ? studentId : null,
      staffId: role === 'staff' || role === 'admin' ? staffId : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return out;
}

export function augmentClasses(existing: ClassRow[], target: number): ClassRow[] {
  const out = [...existing];
  while (out.length < target) {
    out.push({
      id: uuid(),
      name: `Class ${faker.string.alpha({ length: 4 }).toUpperCase()}`,
      type: faker.helpers.arrayElement(['vip', 'basic', 'advance', 'hardcore'] as const),
      status: faker.helpers.arrayElement(['running', 'ended'] as const),
      maxStudents: faker.number.int({ min: 5, max: 30 }),
      allowancePerSessionPerStudent: faker.number.int({ min: 0, max: 100 }),
      maxAllowancePerSession: faker.number.int({ min: 100, max: 500 }),
      scaleAmount: faker.number.int({ min: 0, max: 50 }),
      schedule: [],
      studentTuitionPerSession: faker.number.int({ min: 50, max: 200 }),
      tuitionPackageTotal: faker.number.int({ min: 500, max: 3000 }),
      tuitionPackageSession: faker.number.int({ min: 10, max: 30 }),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return out;
}

export function augmentClassTeachers(
  existing: ClassTeacherRow[],
  classIds: string[],
  teacherIds: string[],
  target: number
): ClassTeacherRow[] {
  const out = [...existing];
  const keySet = new Set(existing.map((r) => `${r.classId}:${r.teacherId}`));
  while (out.length < target) {
    const classId = pick(classIds);
    const teacherId = pick(teacherIds);
    const key = `${classId}:${teacherId}`;
    if (keySet.has(key)) continue;
    keySet.add(key);
    out.push({
      id: uuid(),
      classId,
      teacherId,
      customAllowance: faker.datatype.boolean() ? faker.number.int({ min: 0, max: 100 }) : null,
      status: 'active',
      createdAt: new Date(),
    });
  }
  return out;
}

export function augmentStudentClasses(
  existing: StudentClassRow[],
  studentIds: string[],
  classIds: string[],
  target: number
): StudentClassRow[] {
  const out = [...existing];
  const keySet = new Set(existing.map((r) => `${r.studentId}:${r.classId}`));
  while (out.length < target) {
    const studentId = pick(studentIds);
    const classId = pick(classIds);
    const key = `${studentId}:${classId}`;
    if (keySet.has(key)) continue;
    keySet.add(key);
    out.push({
      id: uuid(),
      studentId,
      classId,
      customStudentTuitionPerSession: null,
      customTuitionPackageTotal: null,
      customTuitionPackageSession: null,
      totalAttendedSession: faker.number.int({ min: 0, max: 50 }),
      createdAt: new Date(),
    });
  }
  return out;
}

export function augmentSessions(
  existing: SessionRow[],
  classIds: string[],
  teacherIds: string[],
  target: number
): SessionRow[] {
  const out = [...existing];
  while (out.length < target) {
    const date = faker.date.recent({ days: 180 });
    const start = new Date(date);
    start.setHours(8, 0, 0, 0);
    const end = new Date(date);
    end.setHours(10, 0, 0, 0);
    out.push({
      id: uuid(),
      teacherId: pick(teacherIds),
      classId: pick(classIds),
      allowanceAmount: faker.number.int({ min: 0, max: 200 }),
      teacherPaymentStatus: faker.helpers.arrayElement(['paid', 'unpaid']),
      date,
      startTime: start,
      endTime: end,
      coefficient: faker.number.float({ min: 0.5, max: 2, fractionDigits: 1 }),
      notes: faker.lorem.sentence(),
      tuitionFee: faker.number.int({ min: 50, max: 150 }),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return out;
}

export function augmentAttendance(
  existing: AttendanceRow[],
  sessionIds: string[],
  studentIds: string[],
  target: number
): AttendanceRow[] {
  const out = [...existing];
  const keySet = new Set(existing.map((r) => `${r.sessionId}:${r.studentId}`));
  while (out.length < target) {
    const sessionId = pick(sessionIds);
    const studentId = pick(studentIds);
    const key = `${sessionId}:${studentId}`;
    if (keySet.has(key)) continue;
    keySet.add(key);
    out.push({
      id: uuid(),
      sessionId,
      studentId,
      status: faker.helpers.arrayElement(['present', 'excused', 'absent'] as const),
      notes: null,
      createdAt: new Date(),
    });
  }
  return out;
}

export function augmentBonuses(
  existing: BonusRow[],
  staffIds: string[],
  target: number
): BonusRow[] {
  const out = [...existing];
  while (out.length < target && staffIds.length > 0) {
    out.push({
      id: uuid(),
      staffId: pick(staffIds),
      workType: faker.helpers.arrayElement(['base', 'bonus', 'overtime']),
      amount: faker.number.int({ min: 50, max: 500 }),
      status: faker.helpers.arrayElement(['paid', 'pending'] as const),
      note: faker.lorem.sentence(),
      month: faker.date.recent({ days: 365 }).toISOString().slice(0, 7),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return out;
}

export function augmentWalletTransactions(
  existing: WalletTransactionsHistoryRow[],
  studentIds: string[],
  staffIds: string[],
  target: number
): WalletTransactionsHistoryRow[] {
  const out = [...existing];
  while (out.length < target && studentIds.length > 0 && staffIds.length > 0) {
    out.push({
      id: uuid(),
      studentId: pick(studentIds),
      type: faker.helpers.arrayElement(['topup', 'loan', 'repayment', 'extend'] as const),
      amount: faker.number.int({ min: 10, max: 500 }),
      note: faker.lorem.sentence(),
      date: faker.date.recent({ days: 365 }),
      customerCareStaffId: pick(staffIds),
      customerCareProfitPercent: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
      customerCarePaymentStatus: faker.datatype.boolean(),
    });
  }
  return out;
}

export function augmentCustomerCareService(
  existing: CustomerCareServiceRow[],
  studentIds: string[],
  staffIds: string[],
  target: number
): CustomerCareServiceRow[] {
  const out = [...existing];
  const keySet = new Set(existing.map((r) => `${r.studentId}:${r.staffId}`));
  while (out.length < target && studentIds.length > 0 && staffIds.length > 0) {
    const studentId = pick(studentIds);
    const staffId = pick(staffIds);
    const key = `${studentId}:${staffId}`;
    if (keySet.has(key)) continue;
    keySet.add(key);
    out.push({
      id: uuid(),
      studentId,
      staffId,
      profitPercent: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
    });
  }
  return out;
}

export function augmentStaffMonthlyStats(
  existing: StaffMonthlyStatRow[],
  staffIds: string[],
  target: number
): StaffMonthlyStatRow[] {
  const out = [...existing];
  const keySet = new Set(existing.map((r) => `${r.staffId}:${r.month}`));
  while (out.length < target && staffIds.length > 0) {
    const staffId = pick(staffIds);
    const month = faker.date.recent({ days: 365 }).toISOString().slice(0, 7);
    const key = `${staffId}:${month}`;
    if (keySet.has(key)) continue;
    keySet.add(key);
    out.push({
      id: uuid(),
      staffId,
      month,
      classesTotalMonth: faker.number.int({ min: 0, max: 20 }),
      classesTotalPaid: faker.number.int({ min: 0, max: 15 }),
      classesTotalUnpaid: faker.number.int({ min: 0, max: 5 }),
      workItemsTotalMonth: faker.number.int({ min: 0, max: 30 }),
      workItemsTotalPaid: faker.number.int({ min: 0, max: 25 }),
      workItemsTotalUnpaid: faker.number.int({ min: 0, max: 5 }),
      bonusesTotalMonth: faker.number.int({ min: 0, max: 500 }),
      bonusesTotalPaid: faker.number.int({ min: 0, max: 400 }),
      bonusesTotalUnpaid: faker.number.int({ min: 0, max: 100 }),
      totalMonthAll: faker.number.int({ min: 1000, max: 10000 }),
      totalPaidAll: faker.number.int({ min: 500, max: 8000 }),
      totalUnpaidAll: faker.number.int({ min: 0, max: 2000 }),
      calculatedAt: new Date(),
    });
  }
  return out;
}

export function augmentDashboardCache(existing: DashboardCacheRow[], target: number): DashboardCacheRow[] {
  const out = [...existing];
  const keySet = new Set(existing.map((r) => r.cacheKey));
  while (out.length < target) {
    const key = `cache_${faker.string.alphanumeric(8)}`;
    if (keySet.has(key)) continue;
    keySet.add(key);
    const expiresAt = faker.date.future();
    out.push({
      cacheKey: key,
      cacheType: faker.helpers.arrayElement(['summary', 'chart', 'list']),
      data: { sample: faker.lorem.sentence() },
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return out;
}

export function augmentCostExtend(existing: CostExtendRow[], target: number): CostExtendRow[] {
  const out = [...existing];
  while (out.length < target) {
    out.push({
      id: uuid(),
      month: faker.date.recent({ days: 365 }).toISOString().slice(0, 7),
      category: faker.commerce.department(),
      amount: faker.number.int({ min: 20, max: 500 }),
      date: faker.date.recent({ days: 90 }),
      status: faker.helpers.arrayElement(['paid', 'pending'] as const),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return out;
}

export function augmentClassSurveys(
  existing: ClassSurveyRow[],
  classIds: string[],
  teacherIds: string[],
  target: number
): ClassSurveyRow[] {
  const out = [...existing];
  while (out.length < target) {
    out.push({
      id: uuid(),
      classId: classIds.length ? pick(classIds) : null,
      testNumber: faker.number.int({ min: 1, max: 10 }),
      teacherId: teacherIds.length ? pick(teacherIds) : null,
      reportDate: faker.date.recent({ days: 180 }),
      content: faker.lorem.paragraphs(2),
      createdAt: new Date(),
    });
  }
  return out;
}

export function augmentActionHistory(
  existing: ActionHistoryRow[],
  userIds: string[],
  target: number
): ActionHistoryRow[] {
  const out = [...existing];
  while (out.length < target) {
    out.push({
      id: uuid(),
      userId: userIds.length ? pick(userIds) : null,
      userEmail: faker.internet.email(),
      entityId: uuid(),
      entityType: faker.helpers.arrayElement(['User', 'Class', 'Student']),
      actionType: faker.helpers.arrayElement(['create', 'update', 'delete']),
      beforeValue: {},
      afterValue: {},
      changedFields: [],
      createdAt: new Date(),
      description: faker.lorem.sentence(),
    });
  }
  return out;
}

export function augmentDocuments(existing: DocumentRow[], target: number): DocumentRow[] {
  const out = [...existing];
  while (out.length < target) {
    out.push({
      id: uuid(),
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      fileUrl: faker.internet.url(),
      tags: [faker.lorem.word(), faker.lorem.word()],
      uploadedBy: null,
    });
  }
  return out;
}

export function augmentLessonTask(existing: LessonTaskRow[], target: number): LessonTaskRow[] {
  const out = [...existing];
  while (out.length < target) {
    out.push({
      id: uuid(),
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      status: faker.helpers.arrayElement(['pending', 'in_progress', 'completed', 'cancelled'] as const),
      priority: faker.helpers.arrayElement(['low', 'medium', 'high'] as const),
      dueDate: faker.date.future(),
      createdBy: null,
    });
  }
  return out;
}

export function augmentStaffLessonTask(
  existing: StaffLessonTaskRow[],
  staffIds: string[],
  lessonTaskIds: string[],
  target: number
): StaffLessonTaskRow[] {
  const out = [...existing];
  const keySet = new Set(existing.map((r) => `${r.staffId}:${r.lessonTaskId}`));
  while (out.length < target && staffIds.length > 0 && lessonTaskIds.length > 0) {
    const staffId = pick(staffIds);
    const lessonTaskId = pick(lessonTaskIds);
    const key = `${staffId}:${lessonTaskId}`;
    if (keySet.has(key)) continue;
    keySet.add(key);
    out.push({ id: uuid(), staffId, lessonTaskId });
  }
  return out;
}

export function augmentLessonResources(existing: LessonResourceRow[], target: number): LessonResourceRow[] {
  const out = [...existing];
  while (out.length < target) {
    out.push({
      id: uuid(),
      resourceLink: faker.internet.url(),
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      tags: [faker.lorem.word()],
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return out;
}

export function augmentLessonOutputs(
  existing: LessonOutputRow[],
  staffIds: string[],
  target: number
): LessonOutputRow[] {
  const out = [...existing];
  while (out.length < target) {
    out.push({
      id: uuid(),
      tag: faker.lorem.word(),
      level: faker.helpers.arrayElement(['A1', 'A2', 'B1', 'B2']),
      lessonName: faker.lorem.sentence(),
      originalTitle: faker.lorem.sentence(),
      source: faker.company.name(),
      originalLink: faker.internet.url(),
      cost: faker.number.int({ min: 0, max: 200 }),
      date: faker.date.recent({ days: 90 }),
      staffPaymentStatus: faker.helpers.arrayElement(['paid', 'pending'] as const),
      contestUploaded: null,
      link: faker.internet.url(),
      staffId: staffIds.length ? pick(staffIds) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return out;
}

/** Run all augmentations to reach target rows per table. Uses augmented IDs for FK consistency. */
export function augmentAll(data: SeedData, target: number, defaultPasswordHash: string): SeedData {
  const staffInfo = augmentStaffInfo(data.staffInfo, target);
  const studentInfo = augmentStudentInfo(data.studentInfo, target);
  const staffIds = staffInfo.map((r) => r.id);
  const studentIds = studentInfo.map((r) => r.id);

  const users = augmentUsers(data.users, staffIds, studentIds, target, defaultPasswordHash);
  const userIds = users.map((r) => r.id);

  const classes = augmentClasses(data.classes, target);
  const classIds = classes.map((r) => r.id);
  const teacherIds = staffIds;

  const classTeachers = augmentClassTeachers(data.classTeachers, classIds, teacherIds, target);
  const studentClasses = augmentStudentClasses(data.studentClasses, studentIds, classIds, target);
  const sessions = augmentSessions(data.sessions, classIds, teacherIds, target);
  const sessionIds = sessions.map((r) => r.id);
  const attendance = augmentAttendance(data.attendance, sessionIds, studentIds, target);

  const bonuses = augmentBonuses(data.bonuses, staffIds, target);
  const walletTransactionsHistory = augmentWalletTransactions(
    data.walletTransactionsHistory,
    studentIds,
    staffIds,
    target
  );
  const customerCareService = augmentCustomerCareService(
    data.customerCareService,
    studentIds,
    staffIds,
    target
  );
  const staffMonthlyStats = augmentStaffMonthlyStats(data.staffMonthlyStats, staffIds, target);
  const dashboardCache = augmentDashboardCache(data.dashboardCache, target);
  const costExtend = augmentCostExtend(data.costExtend, target);
  const classSurveys = augmentClassSurveys(data.classSurveys, classIds, teacherIds, target);
  const actionHistory = augmentActionHistory(data.actionHistory, userIds, target);
  const documents = augmentDocuments(data.documents, target);

  const lessonTask = augmentLessonTask(data.lessonTask, target);
  const lessonTaskIds = lessonTask.map((r) => r.id);
  const staffLessonTask = augmentStaffLessonTask(
    data.staffLessonTask,
    staffIds,
    lessonTaskIds,
    target
  );
  const lessonResources = augmentLessonResources(data.lessonResources, target);
  const lessonOutputs = augmentLessonOutputs(data.lessonOutputs, staffIds, target);

  return {
    staffInfo,
    studentInfo,
    users,
    classes,
    classTeachers,
    studentClasses,
    sessions,
    attendance,
    bonuses,
    walletTransactionsHistory,
    customerCareService,
    staffMonthlyStats,
    dashboardCache,
    costExtend,
    classSurveys,
    actionHistory,
    documents,
    lessonTask,
    staffLessonTask,
    lessonResources,
    lessonOutputs,
  };
}
