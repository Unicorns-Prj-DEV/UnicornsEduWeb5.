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

export function resolveEffectiveTuitionPerSession(options: {
  customTuitionPerSession?: number | null;
  classTuitionPerSession?: number | null;
  effectivePackageTotal?: number | null;
  effectivePackageSession?: number | null;
}): number | null {
  return (
    normalizeStudentClassCustomTuitionMoney(options.customTuitionPerSession) ??
    normalizeNullableMoney(options.classTuitionPerSession) ??
    resolveDerivedTuitionPerSession(
      options.effectivePackageTotal,
      options.effectivePackageSession,
    )
  );
}

export function hasCustomTuitionOverride(options: {
  customTuitionPerSession?: number | null;
  customTuitionPackageTotal?: number | null;
  customTuitionPackageSession?: number | null;
}): boolean {
  return (
    normalizeStudentClassCustomTuitionMoney(options.customTuitionPerSession) !=
      null ||
    normalizeStudentClassCustomTuitionMoney(options.customTuitionPackageTotal) !=
      null ||
    normalizeStudentClassCustomTuitionMoney(
      options.customTuitionPackageSession,
    ) != null
  );
}
