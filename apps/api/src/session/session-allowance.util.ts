/**
 * Snapshot for `sessions.allowance_amount` (VND, floored): per-student allowance for the
 * session teacher × sĩ số điểm danh (present + excused) + `classes.scale_amount`.
 * Payroll SQL applies `coefficient` and `max_allowance_per_session` on top of this snapshot
 * only — it must not add `scale_amount` again from `classes`.
 */
export function computeDefaultSessionAllowanceAmountVnd(input: {
  perStudentAllowance: number | null | undefined;
  classDefaultPerStudent: number | null | undefined;
  scaleAmount: number | null | undefined;
  chargeableStudentCount: number;
}): number {
  const perRaw = input.perStudentAllowance ?? input.classDefaultPerStudent ?? 0;
  const per = Number(perRaw);
  const perSafe = Number.isFinite(per) && per >= 0 ? per : 0;
  const scaleRaw = input.scaleAmount ?? 0;
  const scaleNum = Number(scaleRaw);
  const scaleSafe =
    Number.isFinite(scaleNum) && scaleNum >= 0 ? Math.floor(scaleNum) : 0;
  const n = Math.max(0, Math.floor(Number(input.chargeableStudentCount)) || 0);
  return Math.floor(perSafe * n + scaleSafe);
}
