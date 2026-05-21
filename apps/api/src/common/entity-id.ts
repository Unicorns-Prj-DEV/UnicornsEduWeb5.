import { randomUUID } from 'node:crypto';

const UUID_PART =
  '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

export const STUDENT_ID_PREFIX = 'UNIST-';
export const CLASS_ID_PREFIX = 'UNICL-';
export const STAFF_ID_PREFIX = 'UNISTAFF-';

const STUDENT_ID_RE = new RegExp(`^UNIST-${UUID_PART}$`, 'i');
const CLASS_ID_RE = new RegExp(`^UNICL-${UUID_PART}$`, 'i');
const STAFF_ID_RE = new RegExp(`^UNISTAFF-${UUID_PART}$`, 'i');

export function generateStudentId(): string {
  return `${STUDENT_ID_PREFIX}${randomUUID()}`;
}

export function generateClassId(): string {
  return `${CLASS_ID_PREFIX}${randomUUID()}`;
}

export function generateStaffId(): string {
  return `${STAFF_ID_PREFIX}${randomUUID()}`;
}

export function isStudentId(value: unknown): value is string {
  return typeof value === 'string' && STUDENT_ID_RE.test(value);
}

export function isClassId(value: unknown): value is string {
  return typeof value === 'string' && CLASS_ID_RE.test(value);
}

export function isStaffId(value: unknown): value is string {
  return typeof value === 'string' && STAFF_ID_RE.test(value);
}

export function assertStudentId(value: unknown): asserts value is string {
  if (!isStudentId(value)) {
    throw new Error(`Invalid student id: ${String(value)}`);
  }
}

export function assertClassId(value: unknown): asserts value is string {
  if (!isClassId(value)) {
    throw new Error(`Invalid class id: ${String(value)}`);
  }
}

export function assertStaffId(value: unknown): asserts value is string {
  if (!isStaffId(value)) {
    throw new Error(`Invalid staff id: ${String(value)}`);
  }
}

/** Prefix a bare UUID with the student prefix — used only in migration helpers. */
export function prefixStudentId(bareUuid: string): string {
  return `${STUDENT_ID_PREFIX}${bareUuid}`;
}

/** Prefix a bare UUID with the class prefix — used only in migration helpers. */
export function prefixClassId(bareUuid: string): string {
  return `${CLASS_ID_PREFIX}${bareUuid}`;
}

/** Prefix a bare UUID with the staff prefix — used only in migration helpers. */
export function prefixStaffId(bareUuid: string): string {
  return `${STAFF_ID_PREFIX}${bareUuid}`;
}
