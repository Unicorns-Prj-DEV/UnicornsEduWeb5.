/**
 * Transform CSV string records into typed seed rows.
 * Handles enums, dates, numbers; missing columns use defaults or skip.
 */
import { randomUUID } from 'crypto';
import { anonymizeRecord } from './anonymize';
import type {
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

const uuid = () => randomUUID();

function parseDate(s: string | undefined): Date | null {
  if (!s || !s.trim()) return null;
  const d = new Date(s.trim());
  return isNaN(d.getTime()) ? null : d;
}
function parseTime(s: string | undefined): Date | null {
  if (!s || !s.trim()) return null;
  const [h, m, sec] = s.trim().split(/[:\s]/).map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, sec ?? 0, 0);
  return d;
}
function num(s: string | undefined, def: number): number {
  if (s === undefined || s === null || s === '') return def;
  const n = parseInt(String(s).trim(), 10);
  return Number.isFinite(n) ? n : def;
}
function float(s: string | undefined, def: number): number {
  if (s === undefined || s === null || s === '') return def;
  const n = parseFloat(String(s).trim());
  return Number.isFinite(n) ? n : def;
}

export async function csvToStaffInfo(rows: Record<string, string>[], anonymize: boolean): Promise<StaffInfoRow[]> {
  return rows.map((r) => {
    const rec = anonymize ? anonymizeRecord(r) : r;
    return {
      id: rec.id ?? uuid(),
      fullName: rec.fullName ?? rec.name ?? 'Unknown',
      birthDate: parseDate(rec.birthDate ?? rec.birth_date) ?? undefined,
      university: rec.university || undefined,
      highSchool: rec.highSchool ?? rec.high_school ?? undefined,
      specialization: rec.specialization ?? undefined,
      bankAccount: rec.bankAccount ?? rec.bank_account ?? undefined,
      bankQrLink: rec.bankQrLink ?? rec.bank_qr_link ?? undefined,
      roles: (() => {
        try {
          const v = rec.roles;
          if (!v) return [];
          return JSON.parse(v);
        } catch {
          return [];
        }
      })(),
      status: (rec.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
}

export async function csvToStudentInfo(rows: Record<string, string>[], anonymize: boolean): Promise<StudentInfoRow[]> {
  return rows.map((r) => {
    const rec = anonymize ? anonymizeRecord(r) : r;
    return {
      id: rec.id ?? uuid(),
      fullName: rec.fullName ?? rec.name ?? 'Unknown',
      email: rec.email ?? undefined,
      school: rec.school ?? undefined,
      province: rec.province ?? undefined,
      birthYear: num(rec.birthYear ?? rec.birth_year, 0) || undefined,
      parentName: rec.parentName ?? rec.parent_name ?? undefined,
      parentPhone: rec.parentPhone ?? rec.parent_phone ?? undefined,
      status: (rec.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
      gender: (rec.gender?.toLowerCase() === 'female' ? 'female' : 'male') as 'male' | 'female',
      goal: rec.goal ?? undefined,
      dropOutDate: parseDate(rec.dropOutDate ?? rec.drop_out_date) ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
}

export async function csvToClasses(rows: Record<string, string>[], _anonymize: boolean): Promise<ClassRow[]> {
  return rows.map((r) => ({
    id: r.id ?? uuid(),
    name: r.name ?? 'Unnamed',
    type: (['vip', 'basic', 'advance', 'hardcore'].includes((r.type ?? '').toLowerCase()) ? r.type!.toLowerCase() : 'basic') as ClassRow['type'],
    status: (r.status?.toLowerCase() === 'ended' ? 'ended' : 'running') as ClassRow['status'],
    maxStudents: num(r.maxStudents ?? r.max_students, 15),
    allowancePerSessionPerStudent: num(r.allowancePerSessionPerStudent ?? r.allowance_per_session_per_student, 0),
    maxAllowancePerSession: num(r.maxAllowancePerSession ?? r.max_allowance_per_session, 0) || undefined,
    scaleAmount: num(r.scaleAmount ?? r.scale_amount, 0) || undefined,
    schedule: (() => {
      try {
        const v = r.schedule;
        if (!v) return [];
        return JSON.parse(v);
      } catch {
        return [];
      }
    })(),
    studentTuitionPerSession: num(r.studentTuitionPerSession ?? r.student_tuition_per_session ?? r.tuition_per_session, 0) || undefined,
    tuitionPackageTotal: num(r.tuitionPackageTotal ?? r.tuition_package_total, 0) || undefined,
    tuitionPackageSession: num(r.tuitionPackageSession ?? r.tuition_package_session, 0) || undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

export async function csvToSessions(rows: Record<string, string>[]): Promise<SessionRow[]> {
  return rows.map((r) => {
    const date = parseDate(r.date) ?? new Date();
    return {
      id: r.id ?? uuid(),
      teacherId: r.teacherId ?? r.teacher_id ?? '',
      classId: r.classId ?? r.class_id ?? '',
      allowanceAmount: num(r.allowanceAmount ?? r.allowance_amount, 0) || undefined,
      teacherPaymentStatus: r.teacherPaymentStatus ?? r.teacher_payment_status ?? 'unpaid',
      date,
      startTime: parseTime(r.startTime ?? r.start_time) ?? undefined,
      endTime: parseTime(r.endTime ?? r.end_time) ?? undefined,
      coefficient: float(r.coefficient, 1),
      notes: r.notes ?? undefined,
      tuitionFee: num(r.tuitionFee ?? r.tuition_fee, 0) || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
}

export async function csvToAttendance(rows: Record<string, string>[]): Promise<AttendanceRow[]> {
  return rows.map((r) => ({
    id: r.id ?? uuid(),
    sessionId: r.sessionId ?? r.session_id ?? '',
    studentId: r.studentId ?? r.student_id ?? '',
    status: (['present', 'excused', 'absent'].includes((r.status ?? '').toLowerCase()) ? r.status!.toLowerCase() : 'present') as AttendanceRow['status'],
    notes: r.notes ?? undefined,
    createdAt: new Date(),
  }));
}

export async function csvToUsersFromStaffAndStudents(
  staffRows: StaffInfoRow[],
  studentRows: StudentInfoRow[],
  defaultPasswordHash: string
): Promise<UserRow[]> {
  const users: UserRow[] = [];
  for (const s of staffRows) {
    users.push({
      id: uuid(),
      email: `staff-${s.id.slice(0, 8)}@seed.local`,
      phone: null,
      passwordHash: defaultPasswordHash,
      name: s.fullName,
      roleType: 'staff',
      province: s.university ?? null,
      status: 'active',
      linkId: null,
      accountHandle: null,
      emailVerified: false,
      phoneVerified: false,
      refreshToken: null,
      studentId: null,
      staffId: s.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  for (const s of studentRows) {
    users.push({
      id: uuid(),
      email: s.email ?? `student-${s.id.slice(0, 8)}@seed.local`,
      phone: s.parentPhone ?? null,
      passwordHash: defaultPasswordHash,
      name: s.fullName,
      roleType: 'student',
      province: s.province ?? null,
      status: 'active',
      linkId: null,
      accountHandle: null,
      emailVerified: false,
      phoneVerified: false,
      refreshToken: null,
      studentId: s.id,
      staffId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return users;
}
