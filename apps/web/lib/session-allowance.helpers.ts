/** Pre-coefficient snapshot stored as / sent as `allowanceAmount` (VND, floored). */
export function computeSessionAllowanceRawBaseVnd(options: {
  allowancePerStudent: number;
  chargeableStudentCount: number;
  scaleAmount?: number | null;
}): number {
  const scale = Math.max(0, Math.floor(Number(options.scaleAmount ?? 0)));
  const per = Math.max(0, Number(options.allowancePerStudent));
  const count = Math.max(0, Math.floor(options.chargeableStudentCount));
  if (!Number.isFinite(per)) {
    return scale;
  }
  return Math.floor(per * count + scale);
}

/** Gross before tax/operating: applies session coefficient and class max cap (display / parity with SQL LEAST). */
export function computeTeacherSessionAllowanceGrossPreviewVnd(options: {
  rawBase: number;
  coefficient: number;
  maxAllowancePerSession?: number | null;
}): number {
  const coeff =
    Number.isFinite(options.coefficient) &&
    options.coefficient >= 0.1 &&
    options.coefficient <= 9.9
      ? options.coefficient
      : 1;
  const base = Math.floor(Math.max(0, options.rawBase) * coeff);
  const maxCap = options.maxAllowancePerSession;
  if (maxCap != null && maxCap > 0) {
    return Math.min(maxCap, base);
  }
  return base;
}
