import {
  generateStudentId,
  generateClassId,
  generateStaffId,
  generateLessonTaskId,
  generateLessonResourceId,
  generateLessonOutputId,
  generateStaffLessonTaskId,
  isStudentId,
  isClassId,
  isStaffId,
  isLessonTaskId,
  isLessonResourceId,
  isLessonOutputId,
  isStaffLessonTaskId,
  isEntityIdUniqueConstraintError,
} from './entity-id';

const BARE_UUID = '0b45b3cc-6d67-4d7b-9c78-7f346c9a6fd7';
const STUDENT_ID = 'UNIST-0b45b3cc6d';
const CLASS_ID = 'UNICL-0b45b3cc6d';
const STAFF_ID = 'UNISTAFF-0b45b3cc6d';
const LESSON_TASK_ID = 'UNILTK-0b45b3cc6d';
const LESSON_RESOURCE_ID = 'UNILRS-0b45b3cc6d';
const LESSON_OUTPUT_ID = 'UNILOT-0b45b3cc6d';
const STAFF_LESSON_TASK_ID = 'UNISLT-0b45b3cc6d';

describe('entity-id generators', () => {
  it('generates a valid student id', () => {
    const id = generateStudentId();
    expect(id).toMatch(/^UNIST-[0-9a-f]{10}$/);
    expect(isStudentId(id)).toBe(true);
  });

  it('generates a valid class id', () => {
    const id = generateClassId();
    expect(id).toMatch(/^UNICL-[0-9a-f]{10}$/);
    expect(isClassId(id)).toBe(true);
  });

  it('generates a valid staff id', () => {
    const id = generateStaffId();
    expect(id).toMatch(/^UNISTAFF-[0-9a-f]{10}$/);
    expect(isStaffId(id)).toBe(true);
  });

  it('generates a valid lesson task id', () => {
    const id = generateLessonTaskId();
    expect(id).toMatch(/^UNILTK-[0-9a-f]{10}$/);
    expect(isLessonTaskId(id)).toBe(true);
  });

  it('generates a valid lesson resource id', () => {
    const id = generateLessonResourceId();
    expect(id).toMatch(/^UNILRS-[0-9a-f]{10}$/);
    expect(isLessonResourceId(id)).toBe(true);
  });

  it('generates a valid lesson output id', () => {
    const id = generateLessonOutputId();
    expect(id).toMatch(/^UNILOT-[0-9a-f]{10}$/);
    expect(isLessonOutputId(id)).toBe(true);
  });

  it('generates a valid staff lesson task id', () => {
    const id = generateStaffLessonTaskId();
    expect(id).toMatch(/^UNISLT-[0-9a-f]{10}$/);
    expect(isStaffLessonTaskId(id)).toBe(true);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, generateStudentId));
    expect(ids.size).toBe(100);
  });
});

describe('isStudentId', () => {
  it('accepts a valid student id', () => {
    expect(isStudentId(STUDENT_ID)).toBe(true);
  });

  it('rejects a bare UUID', () => {
    expect(isStudentId(BARE_UUID)).toBe(false);
  });

  it('rejects an old prefixed UUID', () => {
    expect(isStudentId(`UNIST-${BARE_UUID}`)).toBe(false);
  });

  it('rejects uppercase short suffixes', () => {
    expect(isStudentId('UNIST-0B45B3CC6D')).toBe(false);
  });

  it('rejects a class prefix on student check', () => {
    expect(isStudentId(CLASS_ID)).toBe(false);
  });

  it('rejects a staff prefix on student check', () => {
    expect(isStudentId(STAFF_ID)).toBe(false);
  });

  it('rejects non-string', () => {
    expect(isStudentId(null)).toBe(false);
    expect(isStudentId(undefined)).toBe(false);
    expect(isStudentId(42)).toBe(false);
  });
});

describe('isClassId', () => {
  it('accepts a valid class id', () => {
    expect(isClassId(CLASS_ID)).toBe(true);
  });

  it('rejects a bare UUID', () => {
    expect(isClassId(BARE_UUID)).toBe(false);
  });

  it('rejects an old prefixed UUID', () => {
    expect(isClassId(`UNICL-${BARE_UUID}`)).toBe(false);
  });

  it('rejects student prefix', () => {
    expect(isClassId(STUDENT_ID)).toBe(false);
  });
});

describe('isStaffId', () => {
  it('accepts a valid staff id', () => {
    expect(isStaffId(STAFF_ID)).toBe(true);
  });

  it('rejects a bare UUID', () => {
    expect(isStaffId(BARE_UUID)).toBe(false);
  });

  it('rejects an old prefixed UUID', () => {
    expect(isStaffId(`UNISTAFF-${BARE_UUID}`)).toBe(false);
  });

  it('rejects class prefix', () => {
    expect(isStaffId(CLASS_ID)).toBe(false);
  });
});

describe('isLessonTaskId', () => {
  it('accepts a valid lesson task id', () => {
    expect(isLessonTaskId(LESSON_TASK_ID)).toBe(true);
  });
  it('rejects a bare UUID', () => {
    expect(isLessonTaskId(BARE_UUID)).toBe(false);
  });
  it('rejects student prefix', () => {
    expect(isLessonTaskId(STUDENT_ID)).toBe(false);
  });
});

describe('isLessonResourceId', () => {
  it('accepts a valid lesson resource id', () => {
    expect(isLessonResourceId(LESSON_RESOURCE_ID)).toBe(true);
  });
  it('rejects a bare UUID', () => {
    expect(isLessonResourceId(BARE_UUID)).toBe(false);
  });
  it('rejects lesson task prefix', () => {
    expect(isLessonResourceId(LESSON_TASK_ID)).toBe(false);
  });
});

describe('isLessonOutputId', () => {
  it('accepts a valid lesson output id', () => {
    expect(isLessonOutputId(LESSON_OUTPUT_ID)).toBe(true);
  });
  it('rejects a bare UUID', () => {
    expect(isLessonOutputId(BARE_UUID)).toBe(false);
  });
  it('rejects lesson resource prefix', () => {
    expect(isLessonOutputId(LESSON_RESOURCE_ID)).toBe(false);
  });
});

describe('isStaffLessonTaskId', () => {
  it('accepts a valid staff lesson task id', () => {
    expect(isStaffLessonTaskId(STAFF_LESSON_TASK_ID)).toBe(true);
  });
  it('rejects a bare UUID', () => {
    expect(isStaffLessonTaskId(BARE_UUID)).toBe(false);
  });
  it('rejects lesson output prefix', () => {
    expect(isStaffLessonTaskId(LESSON_OUTPUT_ID)).toBe(false);
  });
});

describe('isEntityIdUniqueConstraintError', () => {
  it('detects Prisma unique id collisions', () => {
    expect(
      isEntityIdUniqueConstraintError({
        code: 'P2002',
        meta: { target: ['id'] },
      }),
    ).toBe(true);
  });

  it('ignores non-id unique constraint errors', () => {
    expect(
      isEntityIdUniqueConstraintError({
        code: 'P2002',
        meta: { target: ['email'] },
      }),
    ).toBe(false);
  });
});
