/**
 * Shared helpers for student↔class tuition: class defaults vs optional overrides on `student_classes`.
 *
 * Custom override columns (`custom_*`) treat `0` as **unset** (inherit class tuition), matching
 * operator expectations when clearing fields; only positive amounts are real overrides.
 */

export function normalizeNullableMoney(
  value: number | null | undefined,
): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.floor(value);
}

/** Custom override on `student_classes`: `0` means inherit from class (same as `null`). */
export function normalizeStudentClassCustomTuitionMoney(
  value: number | null | undefined,
): number | null {
  const n = normalizeNullableMoney(value);
  return n === 0 ? null : n;
}

export function resolveDerivedTuitionPerSession(
  packageTotal: number | null | undefined,
  packageSession: number | null | undefined,
): number | null {
  if (
    typeof packageTotal !== 'number' ||
    !Number.isFinite(packageTotal) ||
    typeof packageSession !== 'number' ||
    !Number.isFinite(packageSession) ||
    packageSession <= 0
  ) {
    return null;
  }

  return Math.round(packageTotal / packageSession);
}

export function resolveEffectivePackageFields(options: {
  customTuitionPackageTotal?: number | null;
  customTuitionPackageSession?: number | null;
  classTuitionPackageTotal?: number | null;
  classTuitionPackageSession?: number | null;
}): {
  effectivePackageTotal: number | null;
  effectivePackageSession: number | null;
  hasCustomPackageOverride: boolean;
} {
  const customTuitionPackageTotal = normalizeStudentClassCustomTuitionMoney(
    options.customTuitionPackageTotal,
  );
  const customTuitionPackageSession = normalizeStudentClassCustomTuitionMoney(
    options.customTuitionPackageSession,
  );
  const hasCustomPackageOverride =
    customTuitionPackageTotal != null || customTuitionPackageSession != null;

  return {
    effectivePackageTotal:
      customTuitionPackageTotal ??
      normalizeNullableMoney(options.classTuitionPackageTotal),
    effectivePackageSession:
      customTuitionPackageSession ??
      normalizeNullableMoney(options.classTuitionPackageSession),
    hasCustomPackageOverride,
  };
}

export function hasCustomPackageOverride(options: {
  customTuitionPackageTotal?: number | null;
  customTuitionPackageSession?: number | null;
}): boolean {
  return (
    normalizeStudentClassCustomTuitionMoney(
      options.customTuitionPackageTotal,
    ) != null ||
    normalizeStudentClassCustomTuitionMoney(
      options.customTuitionPackageSession,
    ) != null
  );
}

export function resolveEffectiveTuitionPerSession(options: {
  customTuitionPerSession?: number | null;
  classTuitionPerSession?: number | null;
  effectivePackageTotal?: number | null;
  effectivePackageSession?: number | null;
  hasCustomPackageOverride?: boolean;
}): number | null {
  const customTuitionPerSession = normalizeStudentClassCustomTuitionMoney(
    options.customTuitionPerSession,
  );
  if (customTuitionPerSession != null) {
    return customTuitionPerSession;
  }

  const derivedFromEffectivePackage = resolveDerivedTuitionPerSession(
    options.effectivePackageTotal,
    options.effectivePackageSession,
  );

  if (options.hasCustomPackageOverride && derivedFromEffectivePackage != null) {
    return derivedFromEffectivePackage;
  }

  const classTuitionPerSession = normalizeNullableMoney(
    options.classTuitionPerSession,
  );
  if (classTuitionPerSession != null) {
    return classTuitionPerSession;
  }

  return derivedFromEffectivePackage;
}

export function hasCustomTuitionOverride(options: {
  customTuitionPerSession?: number | null;
  customTuitionPackageTotal?: number | null;
  customTuitionPackageSession?: number | null;
}): boolean {
  return (
    normalizeStudentClassCustomTuitionMoney(options.customTuitionPerSession) !=
      null ||
    normalizeStudentClassCustomTuitionMoney(
      options.customTuitionPackageTotal,
    ) != null ||
    normalizeStudentClassCustomTuitionMoney(
      options.customTuitionPackageSession,
    ) != null
  );
}
