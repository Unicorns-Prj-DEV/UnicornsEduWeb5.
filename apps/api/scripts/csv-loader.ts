/**
 * CSV loader with legacy column → current schema mapping.
 * Handles missing columns gracefully (omits or uses default).
 */
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';

export type LegacyHeaderMap = Record<string, string>; // legacy header -> schema field

/** Map legacy CSV headers to schema field names (case-insensitive match on legacy key) */
export const LEGACY_HEADER_MAP: Record<string, LegacyHeaderMap> = {
  students: {
    id: 'id',
    student_id: 'id',
    full_name: 'fullName',
    fullName: 'fullName',
    name: 'fullName',
    email: 'email',
    school: 'school',
    province: 'province',
    birth_year: 'birthYear',
    birthYear: 'birthYear',
    parent_name: 'parentName',
    parentName: 'parentName',
    parent_phone: 'parentPhone',
    parentPhone: 'parentPhone',
    status: 'status',
    gender: 'gender',
    goal: 'goal',
    drop_out_date: 'dropOutDate',
    dropOutDate: 'dropOutDate',
  },
  staff: {
    id: 'id',
    staff_id: 'id',
    full_name: 'fullName',
    fullName: 'fullName',
    name: 'fullName',
    birth_date: 'birthDate',
    birthDate: 'birthDate',
    university: 'university',
    high_school: 'highSchool',
    highSchool: 'highSchool',
    specialization: 'specialization',
    bank_account: 'bankAccount',
    bankAccount: 'bankAccount',
    bank_qr_link: 'bankQrLink',
    bankQrLink: 'bankQrLink',
    roles: 'roles',
    status: 'status',
  },
  classes: {
    id: 'id',
    class_id: 'id',
    name: 'name',
    type: 'type',
    status: 'status',
    max_students: 'maxStudents',
    maxStudents: 'maxStudents',
    allowance_per_session_per_student: 'allowancePerSessionPerStudent',
    max_allowance_per_session: 'maxAllowancePerSession',
    scale_amount: 'scaleAmount',
    schedule: 'schedule',
    student_tuition_per_session: 'studentTuitionPerSession',
    tuition_per_session: 'studentTuitionPerSession',
    tuition_package_total: 'tuitionPackageTotal',
    tuition_package_session: 'tuitionPackageSession',
  },
  sessions: {
    id: 'id',
    session_id: 'id',
    teacher_id: 'teacherId',
    teacherId: 'teacherId',
    class_id: 'classId',
    classId: 'classId',
    date: 'date',
    start_time: 'startTime',
    startTime: 'startTime',
    end_time: 'endTime',
    endTime: 'endTime',
    allowance_amount: 'allowanceAmount',
    teacher_payment_status: 'teacherPaymentStatus',
    coefficient: 'coefficient',
    notes: 'notes',
    tuition_fee: 'tuitionFee',
    tuitionFee: 'tuitionFee',
  },
  attendance: {
    id: 'id',
    session_id: 'sessionId',
    sessionId: 'sessionId',
    student_id: 'studentId',
    studentId: 'studentId',
    status: 'status',
    notes: 'notes',
  },
};

export interface LoadCsvOptions {
  map: LegacyHeaderMap;
  /** Skip rows that fail to parse (e.g. wrong column count) */
  skipInvalid?: boolean;
}

/**
 * Load and parse a CSV file; map headers to schema field names.
 * Returns array of records (object with schema field names as keys).
 * Missing columns are omitted. Empty path returns [].
 */
export async function loadCsv(
  filePath: string,
  options: LoadCsvOptions
): Promise<Record<string, string>[]> {
  const { map, skipInvalid = true } = options;
  const normalizedPath = path.resolve(filePath);
  if (!fs.existsSync(normalizedPath)) {
    return [];
  }
  const content = fs.readFileSync(normalizedPath, 'utf-8');
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      bom: true,
    });
    parser.on('readable', function (this: NodeJS.ReadableStream) {
      let record: Record<string, string> | null;
      while ((record = parser.read() as Record<string, string> | null)) {
        const mapped: Record<string, string> = {};
        for (const [legacyKey, value] of Object.entries(record)) {
          const normalizedKey = legacyKey.trim().toLowerCase().replace(/\s+/g, '_');
          const schemaKey =
            map[normalizedKey] ?? map[legacyKey] ?? map[legacyKey.trim()];
          if (schemaKey && value !== undefined && value !== null) {
            mapped[schemaKey] = String(value).trim();
          }
        }
        if (Object.keys(mapped).length > 0 || !skipInvalid) {
          rows.push(mapped);
        }
      }
    });
    parser.on('error', (err) => reject(err));
    parser.on('end', () => resolve(rows));
    parser.write(content);
    parser.end();
  });
}

export async function loadStudentsCsv(filePath: string): Promise<Record<string, string>[]> {
  return loadCsv(filePath, { map: LEGACY_HEADER_MAP.students });
}

export async function loadStaffCsv(filePath: string): Promise<Record<string, string>[]> {
  return loadCsv(filePath, { map: LEGACY_HEADER_MAP.staff });
}

export async function loadClassesCsv(filePath: string): Promise<Record<string, string>[]> {
  return loadCsv(filePath, { map: LEGACY_HEADER_MAP.classes });
}

export async function loadSessionsCsv(filePath: string): Promise<Record<string, string>[]> {
  return loadCsv(filePath, { map: LEGACY_HEADER_MAP.sessions });
}

export async function loadAttendanceCsv(filePath: string): Promise<Record<string, string>[]> {
  return loadCsv(filePath, { map: LEGACY_HEADER_MAP.attendance });
}
