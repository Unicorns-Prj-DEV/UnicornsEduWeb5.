-- `sessions.allowance_amount` now stores the full pre-coefficient base:
-- (per-student allowance × attended present/excused count) + class scale_amount.
-- Payroll queries no longer add `classes.scale_amount` on top. Backfill legacy rows
-- so gross amounts stay unchanged after deploy.
UPDATE sessions AS s
SET allowance_amount =
  COALESCE(s.allowance_amount, 0) + COALESCE(c.scale_amount, 0)
FROM classes AS c
WHERE c.id = s.class_id;
