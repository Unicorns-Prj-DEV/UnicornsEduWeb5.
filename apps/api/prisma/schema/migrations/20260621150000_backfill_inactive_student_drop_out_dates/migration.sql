-- Backfill student_info.drop_out_date for inactive students created before
-- runtime auto-stamping on status transitions.
--
-- Priority:
--   1) Latest action_history row that records a transition to inactive
--   2) student_info.updated_at (UTC calendar day) when no audit trail exists

WITH inactive_transition AS (
  SELECT DISTINCT ON (history.entity_id)
    history.entity_id,
    (history.created_at AT TIME ZONE 'UTC')::DATE AS drop_out_date
  FROM "action_history" AS history
  WHERE history.entity_type = 'student'
    AND history.entity_id IS NOT NULL
    AND (
      history.description LIKE 'Chuyển học sinh sang nghỉ học%'
      OR (
        history.action_type = 'update'
        AND COALESCE(history.after_value ->> 'status', '') = 'inactive'
        AND COALESCE(history.before_value ->> 'status', '') <> 'inactive'
      )
    )
  ORDER BY history.entity_id, history.created_at DESC
)
UPDATE "student_info" AS student
SET "drop_out_date" = transition.drop_out_date
FROM inactive_transition AS transition
WHERE student.id = transition.entity_id
  AND student.status = 'inactive'
  AND student.drop_out_date IS NULL;

UPDATE "student_info" AS student
SET "drop_out_date" = (student.updated_at AT TIME ZONE 'UTC')::DATE
WHERE student.status = 'inactive'
  AND student.drop_out_date IS NULL;
