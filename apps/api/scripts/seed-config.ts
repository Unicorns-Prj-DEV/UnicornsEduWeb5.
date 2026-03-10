/**
 * Seed script configuration.
 * Loads env from mocktest/demo.env and apps/api/.env (DATABASE_URL).
 */
import * as path from 'path';
import * as fs from 'fs';

// From apps/api/scripts/ -> repo root is apps/api/../.. 
const REPO_ROOT = path.resolve(__dirname, '../../..');
const MOCKTEST_ENV = path.join(REPO_ROOT, 'mocktest', 'demo.env');
const API_ENV = path.join(__dirname, '..', '.env');

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value.replace(/^["']|["']$/g, '');
    }
  }
}

/** Load seed-related env (demo.env first, then api .env). Call early in seed.ts */
export function loadSeedEnv(): void {
  loadEnvFile(MOCKTEST_ENV);
  loadEnvFile(API_ENV);
}

export const seedConfig = {
  get repoRoot(): string {
    return REPO_ROOT;
  },
  get csvStudents(): string {
    const v = process.env.SEED_CSV_STUDENTS ?? '';
    return v ? path.isAbsolute(v) ? v : path.join(REPO_ROOT, v) : '';
  },
  get csvStaff(): string {
    const v = process.env.SEED_CSV_STAFF ?? '';
    return v ? path.isAbsolute(v) ? v : path.join(REPO_ROOT, v) : '';
  },
  get csvClasses(): string {
    const v = process.env.SEED_CSV_CLASSES ?? '';
    return v ? path.isAbsolute(v) ? v : path.join(REPO_ROOT, v) : '';
  },
  get csvSessions(): string {
    const v = process.env.SEED_CSV_SESSIONS ?? '';
    return v ? path.isAbsolute(v) ? v : path.join(REPO_ROOT, v) : '';
  },
  get csvAttendance(): string {
    const v = process.env.SEED_CSV_ATTENDANCE ?? '';
    return v ? path.isAbsolute(v) ? v : path.join(REPO_ROOT, v) : '';
  },
  get previewPath(): string {
    const v = process.env.SEED_PREVIEW_PATH ?? 'Full_Database_Preview.docx';
    return path.isAbsolute(v) ? v : path.join(REPO_ROOT, v);
  },
  get targetRows(): number {
    const v = process.env.SEED_TARGET_ROWS ?? '1000';
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : 1000;
  },
  get databaseUrl(): string | undefined {
    return process.env.DATABASE_URL;
  },
};
