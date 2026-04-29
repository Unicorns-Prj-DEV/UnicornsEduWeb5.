import {
  hasCustomTuitionOverride,
  normalizeStudentClassCustomTuitionMoney,
  resolveEffectiveTuitionPerSession,
} from './student-class-tuition.util';

describe('student-class-tuition.util', () => {
  it('treats custom tuition 0 as unset for effective per-session resolution', () => {
    expect(
      resolveEffectiveTuitionPerSession({
        customTuitionPerSession: 0,
        classTuitionPerSession: 200000,
        effectivePackageTotal: null,
        effectivePackageSession: null,
      }),
    ).toBe(200000);
  });

  it('keeps positive custom per-session override', () => {
    expect(
      resolveEffectiveTuitionPerSession({
        customTuitionPerSession: 150000,
        classTuitionPerSession: 200000,
        effectivePackageTotal: null,
        effectivePackageSession: null,
      }),
    ).toBe(150000);
  });

  it('maps stored custom 0 to null for override detection', () => {
    expect(normalizeStudentClassCustomTuitionMoney(0)).toBeNull();
    expect(
      hasCustomTuitionOverride({
        customTuitionPerSession: 0,
        customTuitionPackageTotal: null,
        customTuitionPackageSession: null,
      }),
    ).toBe(false);
  });
});
