-- Lớp của khoá THPTQG và PREVOI thành lớp bán một lần.
-- Doanh thu present/excused của từng học sinh dồn về buổi sớm nhất.
-- Ví và trợ cấp gia sư không đổi. Hoa hồng paid/pending giữ học phí cũ
-- trong payroll_basis_tuition_fee.

ALTER TABLE "attendance"
  ADD COLUMN IF NOT EXISTS "payroll_basis_tuition_fee" INTEGER;

WITH ranked AS (
  SELECT
    a.id,
    a.tuition_fee,
    a.assistant_payment_status,
    a.customer_care_payment_status,
    row_number() OVER (
      PARTITION BY s.class_id, a.student_id
      ORDER BY s.date ASC, s.start_time ASC NULLS LAST, s.created_at ASC, a.id ASC
    ) AS rn,
    SUM(COALESCE(a.tuition_fee, 0)) OVER (
      PARTITION BY s.class_id, a.student_id
    ) AS chargeable_sum
  FROM attendance a
  JOIN sessions s ON s.id = a.session_id
  JOIN classes cl ON cl.id = s.class_id
  JOIN courses c ON c.id = cl.course_id
  WHERE c.name IN ('THPTQG', 'PREVOI')
    AND a.status IN ('present', 'excused')
)
UPDATE attendance a
SET payroll_basis_tuition_fee = ranked.tuition_fee
FROM ranked
WHERE a.id = ranked.id
  AND (
    ranked.assistant_payment_status IN ('paid', 'pending')
    OR ranked.customer_care_payment_status IN ('paid', 'pending')
  )
  AND a.payroll_basis_tuition_fee IS NULL;

WITH ranked AS (
  SELECT
    a.id,
    row_number() OVER (
      PARTITION BY s.class_id, a.student_id
      ORDER BY s.date ASC, s.start_time ASC NULLS LAST, s.created_at ASC, a.id ASC
    ) AS rn,
    SUM(COALESCE(a.tuition_fee, 0)) OVER (
      PARTITION BY s.class_id, a.student_id
    ) AS chargeable_sum
  FROM attendance a
  JOIN sessions s ON s.id = a.session_id
  JOIN classes cl ON cl.id = s.class_id
  JOIN courses c ON c.id = cl.course_id
  WHERE c.name IN ('THPTQG', 'PREVOI')
    AND a.status IN ('present', 'excused')
)
UPDATE attendance a
SET tuition_fee = ranked.chargeable_sum
FROM ranked
WHERE a.id = ranked.id
  AND ranked.rn = 1;

WITH ranked AS (
  SELECT
    a.id,
    row_number() OVER (
      PARTITION BY s.class_id, a.student_id
      ORDER BY s.date ASC, s.start_time ASC NULLS LAST, s.created_at ASC, a.id ASC
    ) AS rn
  FROM attendance a
  JOIN sessions s ON s.id = a.session_id
  JOIN classes cl ON cl.id = s.class_id
  JOIN courses c ON c.id = cl.course_id
  WHERE c.name IN ('THPTQG', 'PREVOI')
    AND a.status IN ('present', 'excused')
)
UPDATE attendance a
SET tuition_fee = 0
FROM ranked
WHERE a.id = ranked.id
  AND ranked.rn > 1;

UPDATE attendance a
SET tuition_fee = 0
FROM sessions s
JOIN classes cl ON cl.id = s.class_id
JOIN courses c ON c.id = cl.course_id
WHERE a.session_id = s.id
  AND c.name IN ('THPTQG', 'PREVOI')
  AND a.status = 'absent'
  AND COALESCE(a.tuition_fee, 0) <> 0;

UPDATE sessions s
SET tuition_fee = COALESCE(agg.total, 0)
FROM (
  SELECT
    a.session_id,
    SUM(COALESCE(a.tuition_fee, 0)) FILTER (
      WHERE a.status IN ('present', 'excused')
    ) AS total
  FROM attendance a
  GROUP BY a.session_id
) agg
WHERE s.id = agg.session_id
  AND s.class_id IN (
    SELECT cl.id
    FROM classes cl
    JOIN courses c ON c.id = cl.course_id
    WHERE c.name IN ('THPTQG', 'PREVOI')
  );

UPDATE classes cl
SET pricing_mode = 'one_time'
FROM courses c
WHERE c.id = cl.course_id
  AND c.name IN ('THPTQG', 'PREVOI')
  AND cl.pricing_mode IS DISTINCT FROM 'one_time';
