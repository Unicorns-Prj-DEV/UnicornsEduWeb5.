import {
  generateStudentId,
  generateClassId,
  generateStaffId,
  isStudentId,
  isClassId,
  isStaffId,
  prefixStudentId,
  prefixClassId,
  prefixStaffId,
} from './entity-id';

const BARE_UUID = '0b45b3cc-6d67-4d7b-9c78-7f346c9a6fd7';

describe('entity-id generators', () => {
  it('generates a valid student id', () => {
    const id = generateStudentId();
    expect(id).toMatch(/^UNIST-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(isStudentId(id)).toBe(true);
  });

  it('generates a valid class id', () => {
    const id = generateClassId();
    expect(id).toMatch(/^UNICL-/);
    expect(isClassId(id)).toBe(true);
  });

  it('generates a valid staff id', () => {
    const id = generateStaffId();
    expect(id).toMatch(/^UNISTAFF-/);
    expect(isStaffId(id)).toBe(true);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, generateStudentId));
    expect(ids.size).toBe(100);
  });
});

describe('isStudentId', () => {
  it('accepts a valid student id', () => {
    expect(isStudentId(`UNIST-${BARE_UUID}`)).toBe(true);
  });

  it('rejects a bare UUID', () => {
    expect(isStudentId(BARE_UUID)).toBe(false);
  });

  it('rejects a class prefix on student check', () => {
    expect(isStudentId(`UNICL-${BARE_UUID}`)).toBe(false);
  });

  it('rejects a staff prefix on student check', () => {
    expect(isStudentId(`UNISTAFF-${BARE_UUID}`)).toBe(false);
  });

  it('rejects non-string', () => {
    expect(isStudentId(null)).toBe(false);
    expect(isStudentId(undefined)).toBe(false);
    expect(isStudentId(42)).toBe(false);
  });
});

describe('isClassId', () => {
  it('accepts a valid class id', () => {
    expect(isClassId(`UNICL-${BARE_UUID}`)).toBe(true);
  });

  it('rejects a bare UUID', () => {
    expect(isClassId(BARE_UUID)).toBe(false);
  });

  it('rejects student prefix', () => {
    expect(isClassId(`UNIST-${BARE_UUID}`)).toBe(false);
  });
});

describe('isStaffId', () => {
  it('accepts a valid staff id', () => {
    expect(isStaffId(`UNISTAFF-${BARE_UUID}`)).toBe(true);
  });

  it('rejects a bare UUID', () => {
    expect(isStaffId(BARE_UUID)).toBe(false);
  });

  it('rejects class prefix', () => {
    expect(isStaffId(`UNICL-${BARE_UUID}`)).toBe(false);
  });
});

describe('prefix helpers', () => {
  it('prefixStudentId prepends UNIST-', () => {
    expect(prefixStudentId(BARE_UUID)).toBe(`UNIST-${BARE_UUID}`);
  });

  it('prefixClassId prepends UNICL-', () => {
    expect(prefixClassId(BARE_UUID)).toBe(`UNICL-${BARE_UUID}`);
  });

  it('prefixStaffId prepends UNISTAFF-', () => {
    expect(prefixStaffId(BARE_UUID)).toBe(`UNISTAFF-${BARE_UUID}`);
  });
});
