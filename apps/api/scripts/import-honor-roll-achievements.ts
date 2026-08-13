/**
 * Import Unicorns IT "Vinh danh" poster achievements into student_achievements.
 * Source: unicorns-edu-landing packages/db honor-roll roster (+ optional extras).
 * No proof images (imagePath / imageWatermarkedPath stay null).
 *
 * Usage (from apps/api):
 *   pnpm dlx tsx scripts/import-honor-roll-achievements.ts
 *   pnpm dlx tsx scripts/import-honor-roll-achievements.ts --create-missing
 *   pnpm dlx tsx scripts/import-honor-roll-achievements.ts --create-missing --apply
 *   pnpm dlx tsx scripts/import-honor-roll-achievements.ts --apply
 *
 * --create-missing: for poster names with zero exact DB match, create StudentInfo
 *   status=inactive, dropOutDate=2025-01-01, no linked user.
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client';
import {
  AchievementLevel,
  Gender,
  StudentStatus,
} from '../generated/enums';
import {
  generateStudentId,
  isEntityIdUniqueConstraintError,
} from '../src/common/entity-id';

const databaseUrl =
  process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error('DATABASE_URL (or DIRECT_URL) is required.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const DROP_OUT_DATE = new Date('2025-01-01T00:00:00.000Z');

type HonorGrade = 'THCS' | 'THPT' | 'TH';

type HonorStudent = {
  name: string;
  school: string;
  grade: HonorGrade;
  achievements: string[];
};

type ParsedRow = {
  studentName: string;
  schoolHint: string;
  rawSchool: string;
  grade: HonorGrade;
  award: string;
  exam: string;
  year: number;
  level: AchievementLevel;
  courseLabel: string;
};

type MatchStatus = 'matched' | 'ambiguous' | 'unmatched' | 'exists';

type MatchResult = ParsedRow & {
  status: MatchStatus;
  studentId: string | null;
  candidates: Array<{ id: string; fullName: string; school: string | null }>;
};

function parseArgs(argv: string[]) {
  return {
    apply: argv.includes('--apply'),
    createMissing: argv.includes('--create-missing'),
  };
}

function normalizeName(value: string) {
  return value
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('vi');
}

function parseAchievement(line: string): { award: string; exam: string } {
  const dashIdx = line.indexOf(' - ');
  if (dashIdx >= 0) {
    return {
      award: line.slice(0, dashIdx).trim(),
      exam: line.slice(dashIdx + 3).trim(),
    };
  }
  return { award: line.trim(), exam: '(chưa phân loại)' };
}

function parseSchool(school: string): string {
  const match = school.match(/^Lớp\s+\d+\s*-\s*(.+)$/i);
  return (match ? match[1] : school).trim();
}

function inferLevel(award: string, exam: string): AchievementLevel {
  const awardLower = award.toLocaleLowerCase('vi');
  const text = `${award} ${exam}`.toLocaleLowerCase('vi');

  if (awardLower.includes('đỗ chuyên tin')) return AchievementLevel.ADMISSION;
  if (/quốc tế|châu á|ioi|apio|icpc/.test(text)) {
    return AchievementLevel.INTERNATIONAL;
  }
  if (/hsg quốc gia|hsg cấp quốc gia/.test(text)) {
    return AchievementLevel.NATIONAL;
  }
  if (
    /dh&đb|tây thiên|trại hè hùng vương|vòng loại.*tin học trẻ|hạng \d+.*khu vực|khu vực miền|liên cụm/.test(
      text,
    )
  ) {
    return AchievementLevel.REGIONAL;
  }
  if (
    /cấp trường|cấp xã|liên trường|phường\s|cấp phường/.test(text)
  ) {
    return AchievementLevel.COMMUNE;
  }
  return AchievementLevel.PROVINCE;
}

function inferYear(award: string): number {
  if (award.toLocaleLowerCase('vi').includes('đỗ chuyên tin')) return 2026;
  return 2025;
}

function courseLabelFor(grade: HonorGrade): string {
  if (grade === 'THPT') return 'KHỐI THPT';
  if (grade === 'TH') return 'KHỐI TH';
  return 'KHỐI THCS';
}

function loadHonorRollFromLanding(): HonorStudent[] {
  const dataPath = path.resolve(
    __dirname,
    '../../../../unicorns-edu-landing/packages/db/src/honor-roll-data.ts',
  );
  const raw = readFileSync(dataPath, 'utf8');
  // Evaluate only the array literal by stripping TS and importing via Function.
  // Safer path: dynamic import fails for .ts without loader; parse with a tiny eval of exported const.
  const marker = 'export const honorRollStudents';
  const start = raw.indexOf(marker);
  if (start < 0) throw new Error(`Cannot find honorRollStudents in ${dataPath}`);
  const eq = raw.indexOf('=', start);
  const arrStart = raw.indexOf('[', eq);
  let depth = 0;
  let end = -1;
  for (let i = arrStart; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end < 0) throw new Error('Failed to parse honorRollStudents array');
  const arrayLiteral = raw.slice(arrStart, end);
  // eslint-disable-next-line no-new-func
  const parsed = new Function(`return (${arrayLiteral});`)() as HonorStudent[];
  return parsed;
}

/** Extra poster rows visible in the user's IT vinh-danh sheets but not yet in landing honor-roll-data. */
const EXTRA_POSTER_STUDENTS: HonorStudent[] = [
  // THPT — poster set with Nguyễn Hoàng Long / Bùi Ngọc Tùng
  {
    name: 'Nguyễn Hoàng Long',
    school: 'Lớp 11 - THPT Chuyên Vĩnh Phúc',
    grade: 'THPT',
    achievements: [
      'Giải Nhì - HSG Quốc gia',
      'Huy chương Vàng - DH&ĐB Bắc Bộ (Tin học 11)',
      'Giải Nhất - HSG THPT tỉnh Phú Thọ',
      'Giải Ba - Hội thi Trí tuệ Tây Thiên lần thứ I (Tin học 11)',
    ],
  },
  {
    name: 'Bùi Ngọc Tùng',
    school: 'Lớp 11 - THPT Chuyên Bắc Giang',
    grade: 'THPT',
    achievements: [
      'Giải Khuyến khích - HSG Quốc gia',
      'Huy chương Bạc - Trại hè Hùng Vương (Tin học 10)',
      'Huy chương Đồng - DH&ĐB Bắc Bộ (Tin học 11)',
    ],
  },
  {
    name: 'Phạm Gia Huy',
    school: 'Lớp 10 - THPT Chuyên Hà Nội - Amsterdam',
    grade: 'THPT',
    achievements: ['Huy chương Bạc - DH&ĐB Bắc Bộ (Tin học 10)'],
  },
  {
    name: 'Nguyễn Đình Khôi',
    school: 'Lớp 10 - THPT Chuyên Thái Nguyên',
    grade: 'THPT',
    achievements: ['Giải Nhì - HSG lớp 10 tỉnh Thái Nguyên'],
  },
  {
    name: 'Đinh Cao Thành',
    school: 'Lớp 11 - THPT Chuyên Thái Nguyên',
    grade: 'THPT',
    achievements: ['Giải Ba - HSG lớp 11 tỉnh Thái Nguyên'],
  },
  {
    name: 'Lưu Quang Minh',
    school: 'Lớp 11 - THPT Chuyên Nguyễn Tất Thành',
    grade: 'THPT',
    achievements: ['Giải Nhì - HSG THPT tỉnh Lào Cai'],
  },
  // THCS — HSG HN / quận (poster with Trần Thúc Việt)
  {
    name: 'Trần Thúc Việt',
    school: 'Lớp 8 - THCS Giảng Võ',
    grade: 'THCS',
    achievements: [
      'Giải Ba - HSG lớp 9 Thành phố Hà Nội',
      'Giải Nhì - Tin học trẻ Thành phố Hà Nội (Bảng B)',
      'Giải Nhất - HSG lớp 9 Quận Ba Đình',
    ],
  },
  {
    name: 'Trịnh Xuân Khôi',
    school: 'Lớp 8 - THCS Giảng Võ',
    grade: 'THCS',
    achievements: [
      'Giải Khuyến khích - HSG lớp 9 Thành phố Hà Nội',
      'Giải Nhất - HSG lớp 9 Quận Ba Đình',
      'Giải Ba - Tin học trẻ Quận Ba Đình (Bảng B)',
    ],
  },
  {
    name: 'Lê Quang Minh',
    school: 'Lớp 8 - THCS Ngô Sĩ Liên',
    grade: 'THCS',
    achievements: [
      'Giải Khuyến khích - HSG lớp 9 Thành phố Hà Nội',
      'Giải Nhất - HSG lớp 9 Quận Hoàn Kiếm',
    ],
  },
  {
    name: 'Hoàng Phúc Điền',
    school: 'Lớp 8 - THCS Lê Lợi',
    grade: 'THCS',
    achievements: ['Giải Nhì - HSG lớp 9 Quận Hà Đông'],
  },
  {
    name: 'Hoàng Minh Chiến',
    school: 'Lớp 9 - THCS Chu Văn An',
    grade: 'THCS',
    achievements: [
      'Giải Ba - HSG lớp 9 Thành phố Hà Nội',
      'Giải Nhì - HSG lớp 9 Quận Tây Hồ',
    ],
  },
  {
    name: 'Đào Hoàng Việt',
    school: 'Lớp 9 - THCS Dịch Vọng',
    grade: 'THCS',
    achievements: ['Giải Ba - HSG lớp 9 Quận Cầu Giấy'],
  },
  {
    name: 'Nguyễn Lê Duy Khánh',
    school: 'Lớp 9 - THCS Cầu Giấy',
    grade: 'THCS',
    achievements: ['Giải Khuyến khích - HSG lớp 9 Quận Cầu Giấy'],
  },
  // Tiểu học
  {
    name: 'Nguyễn Trần Hiếu',
    school: 'Lớp 5 - TH Archimedes Academy',
    grade: 'TH',
    achievements: [
      'Giải Nhì - Tin học trẻ Thành phố Hà Nội (Bảng A)',
      'Giải Nhất - Tin học trẻ Quận Thanh Xuân (Bảng A)',
    ],
  },
  {
    name: 'Đào Trọng Thành',
    school: 'Lớp 5 - TH Archimedes Academy',
    grade: 'TH',
    achievements: ['Giải Nhất - Tin học trẻ Quận Thanh Xuân (Bảng A)'],
  },
  {
    name: 'Phạm Hải Nam',
    school: 'Lớp 5 - TH&THCS Ngôi Sao Hà Nội',
    grade: 'TH',
    achievements: ['Giải Nhì - Tin học trẻ Quận Thanh Xuân (Bảng A)'],
  },
  {
    name: 'Phùng Xuân Tùng',
    school: 'Lớp 4 - TH Đoàn Thị Điểm',
    grade: 'TH',
    achievements: ['Giải Nhì - Tin học trẻ Quận Nam Từ Liêm (Bảng A)'],
  },
  {
    name: 'Trần Hải Minh',
    school: 'Lớp 5 - TH Trần Nhật Duật',
    grade: 'TH',
    achievements: ['Giải Nhì - Tin học trẻ Quận Hoàn Kiếm (Bảng A)'],
  },
  {
    name: 'Ngô Quang Đăng',
    school: 'Lớp 5 - TH Lê Quý Đôn',
    grade: 'TH',
    achievements: ['Giải Ba - Tin học trẻ Quận Hà Đông (Bảng A)'],
  },
  {
    name: 'Trần Xuân Hiển',
    school: 'Lớp 5 - TH Đoàn Kết',
    grade: 'TH',
    achievements: ['Giải Ba - Tin học trẻ Quận Hà Đông (Bảng A)'],
  },
  {
    name: 'Trần Việt An',
    school: 'Lớp 4 - TH Archimedes Academy',
    grade: 'TH',
    achievements: ['Giải Nhất - Tin học trẻ Quận Thanh Xuân (Bảng A)'],
  },
  {
    name: 'Vũ Duy An',
    school: 'Lớp 5 - TH Archimedes Academy',
    grade: 'TH',
    achievements: ['Giải Ba - Tin học trẻ Quận Thanh Xuân (Bảng A)'],
  },
  {
    name: 'Lê Bá Hưng',
    school: 'Lớp 5 - TH&THCS Ngôi Sao Hà Nội',
    grade: 'TH',
    achievements: ['Giải Ba - Tin học trẻ Quận Thanh Xuân (Bảng A)'],
  },
  {
    name: 'Đỗ Trọng Quân',
    school: 'Lớp 5 - TH Lý Thái Tổ',
    grade: 'TH',
    achievements: ['Giải Ba - Tin học trẻ Quận Cầu Giấy (Bảng A)'],
  },
  {
    name: 'Bùi Công Tiến Đạt',
    school: 'Lớp 5 - TH Tràng An',
    grade: 'TH',
    achievements: ['Giải Ba - Tin học trẻ Quận Hoàn Kiếm (Bảng A)'],
  },
  {
    name: 'Lê Quốc Anh',
    school: 'Lớp 5 - TH Nguyễn Trãi',
    grade: 'TH',
    achievements: ['Giải Khuyến khích - Tin học trẻ Quận Hà Đông (Bảng A)'],
  },
  {
    name: 'Nguyễn Ngọc Kim Ngân',
    school: 'Lớp 5 - TH Lê Lợi',
    grade: 'TH',
    achievements: ['Giải Khuyến khích - Tin học trẻ Quận Hà Đông (Bảng A)'],
  },
];

function expandRows(students: HonorStudent[]): ParsedRow[] {
  const rows: ParsedRow[] = [];
  for (const student of students) {
    for (const line of student.achievements) {
      const { award, exam } = parseAchievement(line);
      rows.push({
        studentName: student.name,
        schoolHint: parseSchool(student.school),
        rawSchool: student.school,
        grade: student.grade,
        award,
        exam: exam || '(chưa phân loại)',
        year: inferYear(award),
        level: inferLevel(award, exam),
        courseLabel: courseLabelFor(student.grade),
      });
    }
  }
  return rows;
}

function dedupeStudents(students: HonorStudent[]): HonorStudent[] {
  const byName = new Map<string, HonorStudent>();
  for (const student of students) {
    const key = normalizeName(student.name);
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, { ...student, achievements: [...student.achievements] });
      continue;
    }
    const seen = new Set(existing.achievements.map((a) => normalizeName(a)));
    for (const line of student.achievements) {
      if (!seen.has(normalizeName(line))) {
        existing.achievements.push(line);
        seen.add(normalizeName(line));
      }
    }
  }
  return [...byName.values()];
}

function softAward(value: string) {
  return normalizeName(value).replace(/\bkhuyến khích\b/g, 'khuyến khích');
}

/** Normalize exam text so poster wording matches existing folder imports. */
function softExam(value: string) {
  return normalizeName(value)
    .replace(/\bhsgqg\b/g, 'hsg quốc gia')
    .replace(/^trường\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function achievementKey(studentId: string, award: string, exam: string) {
  return `${studentId}|${softAward(award)}|${softExam(exam)}`;
}

async function matchRows(rows: ParsedRow[]): Promise<MatchResult[]> {
  const students = await prisma.studentInfo.findMany({
    select: { id: true, fullName: true, school: true },
  });

  // Exact full-name match only (NFC + whitespace + vi lowercase). No fuzzy / fold.
  const byName = new Map<string, typeof students>();
  for (const student of students) {
    const key = normalizeName(student.fullName);
    const list = byName.get(key) ?? [];
    list.push(student);
    byName.set(key, list);
  }

  const existing = await prisma.studentAchievement.findMany({
    select: {
      studentId: true,
      award: true,
      exam: true,
    },
  });
  const existingKeys = new Set(
    existing.map((row) =>
      achievementKey(row.studentId, row.award, row.exam),
    ),
  );
  // Also index soft exams per student+award for contains-match (Sư phạm vs Sư phạm Hà Nội).
  const existingSoft = existing.map((row) => ({
    studentId: row.studentId,
    award: softAward(row.award),
    exam: softExam(row.exam),
  }));

  function alreadyExists(studentId: string, award: string, exam: string) {
    const a = softAward(award);
    const e = softExam(exam);
    if (existingKeys.has(`${studentId}|${a}|${e}`)) return true;
    return existingSoft.some((row) => {
      if (row.studentId !== studentId || row.award !== a) return false;
      return row.exam === e || row.exam.includes(e) || e.includes(row.exam);
    });
  }

  return rows.map((row) => {
    const candidates = byName.get(normalizeName(row.studentName)) ?? [];

    if (candidates.length === 0) {
      return { ...row, status: 'unmatched', studentId: null, candidates: [] };
    }

    if (candidates.length > 1) {
      return {
        ...row,
        status: 'ambiguous',
        studentId: null,
        candidates: candidates.map((c) => ({
          id: c.id,
          fullName: c.fullName,
          school: c.school,
        })),
      };
    }

    const chosen = candidates[0];
    const studentId = chosen.id;
    return {
      ...row,
      status: alreadyExists(studentId, row.award, row.exam)
        ? 'exists'
        : 'matched',
      studentId,
      candidates: [
        {
          id: chosen.id,
          fullName: chosen.fullName,
          school: chosen.school,
        },
      ],
    };
  });
}

async function applyCreates(matches: MatchResult[]) {
  const toCreate = matches.filter((row) => row.status === 'matched' && row.studentId);
  let created = 0;
  let failed = 0;

  const sortOrders = new Map<string, number>();
  for (const row of toCreate) {
    const studentId = row.studentId!;
    if (!sortOrders.has(studentId)) {
      const last = await prisma.studentAchievement.findFirst({
        where: { studentId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrders.set(studentId, last?.sortOrder ?? -1);
    }
  }

  for (const row of toCreate) {
    const studentId = row.studentId!;
    try {
      const next = (sortOrders.get(studentId) ?? -1) + 1;
      sortOrders.set(studentId, next);
      await prisma.studentAchievement.create({
        data: {
          studentId,
          award: row.award,
          exam: row.exam,
          year: row.year,
          level: row.level,
          courseLabel: row.courseLabel,
          imagePath: null,
          imageWatermarkedPath: null,
          sortOrder: next,
        },
      });
      created += 1;
      console.log(
        `OK ${row.studentName} | ${row.award} · ${row.exam} | ${row.year} | ${row.level}`,
      );
    } catch (error) {
      failed += 1;
      console.error(
        `FAIL ${row.studentName} | ${row.award} · ${row.exam}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return { created, failed };
}

function printReport(matches: MatchResult[], apply: boolean) {
  const matched = matches.filter((r) => r.status === 'matched');
  const exists = matches.filter((r) => r.status === 'exists');
  const ambiguous = matches.filter((r) => r.status === 'ambiguous');
  const unmatched = matches.filter((r) => r.status === 'unmatched');

  console.log(`\n=== Honor-roll import ${apply ? 'APPLY' : 'DRY-RUN'} ===`);
  console.log(`DB: ${databaseUrl.replace(/:[^:@/]+@/, ':***@')}`);
  console.log(`Total rows:  ${matches.length}`);
  console.log(`To create:   ${matched.length}`);
  console.log(`Already:     ${exists.length}`);
  console.log(`Ambiguous:   ${ambiguous.length}`);
  console.log(`Unmatched:   ${unmatched.length}`);

  if (ambiguous.length) {
    console.log('\n-- Ambiguous --');
    for (const row of ambiguous) {
      console.log(
        `${row.studentName} | ${row.award} · ${row.exam} → ${row.candidates
          .map((c) => `${c.fullName} (${c.school ?? '—'}) [${c.id}]`)
          .join('; ')}`,
      );
    }
  }

  if (unmatched.length) {
    console.log('\n-- Unmatched students (unique) --');
    const unique = [...new Set(unmatched.map((r) => r.studentName))];
    for (const name of unique) {
      const n = unmatched.filter((r) => r.studentName === name).length;
      console.log(`${name} (${n} row)`);
    }
  }

  console.log('\n-- Sample to create (first 20) --');
  for (const row of matched.slice(0, 20)) {
    console.log(
      `${row.studentId} | ${row.studentName} | ${row.award} · ${row.exam} | ${row.year} | ${row.level} | ${row.courseLabel}`,
    );
  }

  const fingerprint = createHash('sha1')
    .update(
      matches
        .map(
          (r) =>
            `${r.status}|${r.studentId ?? ''}|${r.studentName}|${r.award}|${r.exam}|${r.year}`,
        )
        .sort()
        .join('\n'),
    )
    .digest('hex')
    .slice(0, 12);
  console.log(`\nFingerprint: ${fingerprint}`);
}

function inferBirthYear(rawSchool: string, grade: HonorGrade): number | null {
  const match = rawSchool.match(/Lớp\s+(\d+)/i);
  if (!match) {
    if (grade === 'THPT') return 2010;
    if (grade === 'TH') return 2015;
    return 2012;
  }
  const lop = Number(match[1]);
  if (!Number.isFinite(lop)) return null;
  // School year ~2025: grade 10 ≈ birth 2010 → year - grade - 5
  return 2025 - lop - 5;
}

function inferProvince(school: string, examLines: string[]): string | null {
  const text = `${school} ${examLines.join(' ')}`;
  const provinceMatch = text.match(/tỉnh\s+([^,\n(]+)/i);
  if (provinceMatch) return provinceMatch[1].trim();
  const cityMatch = text.match(/thành phố\s+([^,\n(]+)/i);
  if (cityMatch) return cityMatch[1].trim();
  if (/tp\.\s*hà nội|thành phố hà nội|quận\s+|liên cụm thpt hà nội/i.test(text)) {
    return 'Hà Nội';
  }
  if (/tp\.\s*hồ chí minh|thành phố hồ chí minh/i.test(text)) return 'TP. HCM';
  if (/tp\.\s*hải phòng|thành phố hải phòng/i.test(text)) return 'Hải Phòng';

  const map: Array<[RegExp, string]> = [
    [/vĩnh phúc/i, 'Vĩnh Phúc'],
    [/bắc giang/i, 'Bắc Giang'],
    [/bắc ninh/i, 'Bắc Ninh'],
    [/thái nguyên/i, 'Thái Nguyên'],
    [/phú thọ/i, 'Phú Thọ'],
    [/lào cai/i, 'Lào Cai'],
    [/hưng yên/i, 'Hưng Yên'],
    [/tây ninh/i, 'Tây Ninh'],
    [/thanh hóa/i, 'Thanh Hóa'],
    [/bình dương/i, 'Bình Dương'],
    [/nghệ an/i, 'Nghệ An'],
    [/hà tĩnh/i, 'Hà Tĩnh'],
    [/quảng trị/i, 'Quảng Trị'],
    [/đắk lắk|dak lak/i, 'Đắk Lắk'],
    [/an giang/i, 'An Giang'],
    [/kiên giang/i, 'Kiên Giang'],
    [/ninh bình/i, 'Ninh Bình'],
    [/thái bình/i, 'Thái Bình'],
    [/nam định/i, 'Nam Định'],
    [/bình định/i, 'Bình Định'],
    [/huế|quốc học/i, 'Thừa Thiên Huế'],
  ];
  for (const [pattern, province] of map) {
    if (pattern.test(text)) return province;
  }
  return null;
}

function inferGender(fullName: string): Gender {
  if (/\bThị\b/.test(fullName)) return Gender.female;
  return Gender.male;
}

async function createMissingInactiveStudents(
  honorStudents: HonorStudent[],
  apply: boolean,
) {
  const existing = await prisma.studentInfo.findMany({
    select: { fullName: true },
  });
  const existingNames = new Set(existing.map((s) => normalizeName(s.fullName)));

  const missing = honorStudents.filter(
    (s) => !existingNames.has(normalizeName(s.name)),
  );

  console.log(`\n=== Create missing inactive students ${apply ? 'APPLY' : 'DRY-RUN'} ===`);
  console.log(`Missing unique names: ${missing.length}`);
  for (const s of missing.slice(0, 30)) {
    console.log(
      `  ${s.name} | ${parseSchool(s.school)} | ${s.grade} | dropOut=${DROP_OUT_DATE.toISOString().slice(0, 10)}`,
    );
  }
  if (missing.length > 30) console.log(`  … +${missing.length - 30} more`);

  if (!apply) {
    console.log('Dry-run only for student creation. Re-run with --apply.');
    return { created: 0, failed: 0, missing: missing.length };
  }

  let created = 0;
  let failed = 0;
  for (const student of missing) {
    const school = parseSchool(student.school);
    const birthYear = inferBirthYear(student.school, student.grade);
    const province = inferProvince(student.school, student.achievements);
    const gender = inferGender(student.name);

    let attempts = 0;
    while (attempts < 5) {
      attempts += 1;
      try {
        await prisma.studentInfo.create({
          data: {
            id: generateStudentId(),
            fullName: student.name.trim(),
            school,
            province,
            birthYear: birthYear ?? undefined,
            status: StudentStatus.inactive,
            gender,
            dropOutDate: DROP_OUT_DATE,
            userId: null,
            accountBalance: 0,
          },
        });
        created += 1;
        console.log(
          `STUDENT_OK ${student.name} | ${school} | inactive | dropOut=2025-01-01`,
        );
        break;
      } catch (error) {
        if (isEntityIdUniqueConstraintError(error) && attempts < 5) continue;
        failed += 1;
        console.error(
          `STUDENT_FAIL ${student.name}:`,
          error instanceof Error ? error.message : error,
        );
        break;
      }
    }
  }

  console.log(`Students created: ${created}; failed: ${failed}`);
  return { created, failed, missing: missing.length };
}

async function main() {
  const { apply, createMissing } = parseArgs(process.argv.slice(2));
  const landing = loadHonorRollFromLanding();
  const students = dedupeStudents([...landing, ...EXTRA_POSTER_STUDENTS]);
  const rows = expandRows(students);
  console.log(
    `Loaded ${students.length} students / ${rows.length} achievement rows (landing ${landing.length} + extras)`,
  );

  if (createMissing) {
    await createMissingInactiveStudents(students, apply);
  }

  const matches = await matchRows(rows);
  printReport(matches, apply);

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to insert.');
    return;
  }

  const { created, failed } = await applyCreates(matches);
  console.log(`\nAchievements created: ${created}; Failed: ${failed}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
