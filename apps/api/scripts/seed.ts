/**
 * Comprehensive data migration, anonymization, and seeding.
 *
 * 1. Load legacy CSV from paths in mocktest/demo.env
 * 2. Map columns to schema, anonymize PII (faker), hash passwords (bcrypt)
 * 3. Augment each table to SEED_TARGET_ROWS (default 1000) with valid FKs
 * 4. Export Full_Database_Preview.docx (30 rows per table) for review
 * 5. Optionally sync to DB (DATABASE_URL): --sync [--clean-start]
 *
 * Usage:
 *   npx ts-node scripts/seed.ts
 *   npx ts-node scripts/seed.ts --sync
 *   npx ts-node scripts/seed.ts --sync --clean-start
 */
import { loadSeedEnv, seedConfig } from './seed-config';
import {
  loadStudentsCsv,
  loadStaffCsv,
  loadClassesCsv,
  loadSessionsCsv,
  loadAttendanceCsv,
} from './csv-loader';
import { hashPasswordOrDefault } from './password-hash';
import {
  csvToStaffInfo,
  csvToStudentInfo,
  csvToClasses,
  csvToSessions,
  csvToAttendance,
  csvToUsersFromStaffAndStudents,
} from './transform-csv-to-rows';
import { augmentAll } from './augment';
import { generatePreviewDocx, toTablePreview } from './preview-docx';
import { syncToDb, disconnect } from './db-sync';
import type { SeedData } from './seed-types';

function parseArgs(): { sync: boolean; cleanStart: boolean } {
  const args = process.argv.slice(2);
  return {
    sync: args.includes('--sync'),
    cleanStart: args.includes('--clean-start'),
  };
}

function emptySeedData(): SeedData {
  return {
    staffInfo: [],
    studentInfo: [],
    users: [],
    classes: [],
    classTeachers: [],
    studentClasses: [],
    sessions: [],
    attendance: [],
    bonuses: [],
    walletTransactionsHistory: [],
    customerCareService: [],
    staffMonthlyStats: [],
    dashboardCache: [],
    costExtend: [],
    classSurveys: [],
    actionHistory: [],
    documents: [],
    lessonTask: [],
    staffLessonTask: [],
    lessonResources: [],
    lessonOutputs: [],
  };
}

async function main(): Promise<void> {
  loadSeedEnv();

  const target = seedConfig.targetRows;
  const previewPath = seedConfig.previewPath;
  const { sync, cleanStart } = parseArgs();

  console.log('Seed: loading CSV and building initial data...');

  const defaultPasswordHash = await hashPasswordOrDefault(process.env.SEED_DEFAULT_PASSWORD ?? undefined);

  let data = emptySeedData();

  try {
    if (seedConfig.csvStaff) {
      const raw = await loadStaffCsv(seedConfig.csvStaff);
      data.staffInfo = await csvToStaffInfo(raw, true);
      console.log(`  staff_info: ${data.staffInfo.length} from CSV`);
    }
    if (seedConfig.csvStudents) {
      const raw = await loadStudentsCsv(seedConfig.csvStudents);
      data.studentInfo = await csvToStudentInfo(raw, true);
      console.log(`  student_info: ${data.studentInfo.length} from CSV`);
    }
    if (data.staffInfo.length || data.studentInfo.length) {
      data.users = await csvToUsersFromStaffAndStudents(
        data.staffInfo,
        data.studentInfo,
        defaultPasswordHash
      );
      console.log(`  users: ${data.users.length} (from staff/student)`);
    }
    if (seedConfig.csvClasses) {
      const raw = await loadClassesCsv(seedConfig.csvClasses);
      data.classes = await csvToClasses(raw, false);
      console.log(`  classes: ${data.classes.length} from CSV`);
    }
    if (seedConfig.csvSessions) {
      const raw = await loadSessionsCsv(seedConfig.csvSessions);
      data.sessions = await csvToSessions(raw);
      console.log(`  sessions: ${data.sessions.length} from CSV`);
    }
    if (seedConfig.csvAttendance) {
      const raw = await loadAttendanceCsv(seedConfig.csvAttendance);
      data.attendance = await csvToAttendance(raw);
      console.log(`  attendance: ${data.attendance.length} from CSV`);
    }
  } catch (e) {
    console.error('Error loading or transforming CSV:', e);
    throw e;
  }

  if (data.staffInfo.length === 0) {
    data.staffInfo = (await csvToStaffInfo([{ id: 'seed-staff-1', fullName: 'Seed Staff', status: 'active', roles: '[]' }], false));
  }
  if (data.studentInfo.length === 0) {
    data.studentInfo = (await csvToStudentInfo([{ id: 'seed-student-1', fullName: 'Seed Student', status: 'active', gender: 'male' }], false));
  }
  if (data.classes.length === 0) {
    data.classes = await csvToClasses([{ id: 'seed-class-1', name: 'Seed Class', type: 'basic', status: 'running', maxStudents: '15', allowance_per_session_per_student: '0', schedule: '[]' }], false);
  }

  console.log('Seed: augmenting to', target, 'rows per table...');
  data = augmentAll(data, target, defaultPasswordHash);

  const tablePreviews = [
    toTablePreview('staff_info', data.staffInfo as unknown as Record<string, unknown>[]),
    toTablePreview('student_info', data.studentInfo as unknown as Record<string, unknown>[]),
    toTablePreview('users', data.users as unknown as Record<string, unknown>[]),
    toTablePreview('classes', data.classes as unknown as Record<string, unknown>[]),
    toTablePreview('class_teachers', data.classTeachers as unknown as Record<string, unknown>[]),
    toTablePreview('student_classes', data.studentClasses as unknown as Record<string, unknown>[]),
    toTablePreview('sessions', data.sessions as unknown as Record<string, unknown>[]),
    toTablePreview('attendance', data.attendance as unknown as Record<string, unknown>[]),
    toTablePreview('bonuses', data.bonuses as unknown as Record<string, unknown>[]),
    toTablePreview('wallet_transactions_history', data.walletTransactionsHistory as unknown as Record<string, unknown>[]),
    toTablePreview('customer_care_service', data.customerCareService as unknown as Record<string, unknown>[]),
    toTablePreview('staff_monthly_stats', data.staffMonthlyStats as unknown as Record<string, unknown>[]),
    toTablePreview('dashboard_cache', data.dashboardCache as unknown as Record<string, unknown>[]),
    toTablePreview('cost_extend', data.costExtend as unknown as Record<string, unknown>[]),
    toTablePreview('class_surveys', data.classSurveys as unknown as Record<string, unknown>[]),
    toTablePreview('action_history', data.actionHistory as unknown as Record<string, unknown>[]),
    toTablePreview('documents', data.documents as unknown as Record<string, unknown>[]),
    toTablePreview('lesson_task', data.lessonTask as unknown as Record<string, unknown>[]),
    toTablePreview('staff_lesson_task', data.staffLessonTask as unknown as Record<string, unknown>[]),
    toTablePreview('lesson_resources', data.lessonResources as unknown as Record<string, unknown>[]),
    toTablePreview('lesson_outputs', data.lessonOutputs as unknown as Record<string, unknown>[]),
  ];

  console.log('Seed: writing', previewPath, '...');
  await generatePreviewDocx(previewPath, tablePreviews);
  console.log('Preview written. Review the document before syncing to DB.');

  if (sync) {
    const url = seedConfig.databaseUrl;
    if (!url) {
      console.error('DATABASE_URL is not set (e.g. in apps/api/.env). Cannot sync.');
      process.exit(1);
    }
    console.log('Syncing to database...' + (cleanStart ? ' (clean start: truncate first)' : ''));
    try {
      await syncToDb(data, cleanStart);
      console.log('Sync completed.');
    } catch (e) {
      console.error('Sync failed:', e);
      await disconnect();
      process.exit(1);
    }
    await disconnect();
  } else {
    console.log('Skipping DB sync. Run with --sync to push data, or --sync --clean-start to truncate then insert.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
