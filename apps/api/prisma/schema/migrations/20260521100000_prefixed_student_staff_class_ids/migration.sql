-- Migration: prefixed_student_staff_class_ids
-- Adds UNIST- / UNISTAFF- / UNICL- prefix to the three entity PKs.
-- All direct FK children use ON UPDATE CASCADE so they update automatically.
-- Manual backfills are needed for JSONB / TEXT columns that embed these IDs.
--
-- Run on shared envs via: pnpm --filter api db:deploy  (NOT migrate dev)
-- After deploy: DELETE FROM dashboard_cache is included below.
-- Google Calendar metadata must be resynced via the admin resync endpoints.

BEGIN;

-- ============================================================
-- 1. PREFLIGHT — abort early if any row already carries a prefix
--    (re-entrant safety: migration is idempotent when re-run)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "student_info" WHERE "id" LIKE 'UNIST-%' LIMIT 1
  ) THEN
    RAISE EXCEPTION
      'prefixed_student_staff_class_ids: student_info already has prefixed rows. Migration likely already applied. Aborting.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "staff_info" WHERE "id" LIKE 'UNISTAFF-%' LIMIT 1
  ) THEN
    RAISE EXCEPTION
      'prefixed_student_staff_class_ids: staff_info already has prefixed rows. Migration likely already applied. Aborting.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "classes" WHERE "id" LIKE 'UNICL-%' LIMIT 1
  ) THEN
    RAISE EXCEPTION
      'prefixed_student_staff_class_ids: classes already has prefixed rows. Migration likely already applied. Aborting.';
  END IF;
END $$;

-- ============================================================
-- 2. PK UPDATES — ON UPDATE CASCADE propagates to ~30+ FK tables
-- ============================================================

-- 2a. student_info
UPDATE "student_info"
SET "id" = 'UNIST-' || "id"
WHERE "id" NOT LIKE 'UNIST-%';

-- 2b. staff_info (self-FK customer_care_managed_by_staff_id also uses CASCADE)
UPDATE "staff_info"
SET "id" = 'UNISTAFF-' || "id"
WHERE "id" NOT LIKE 'UNISTAFF-%';

-- 2c. classes
UPDATE "classes"
SET "id" = 'UNICL-' || "id"
WHERE "id" NOT LIKE 'UNICL-%';

-- ============================================================
-- 3. classes.schedule JSONB — teacherId inside each slot entry
--    Each slot is an object; teacherId may be null when unset.
-- ============================================================
UPDATE "classes"
SET "schedule" = (
  SELECT jsonb_agg(
    CASE
      WHEN (entry->>'teacherId') IS NOT NULL
        AND (entry->>'teacherId') NOT LIKE 'UNISTAFF-%'
      THEN jsonb_set(
        entry,
        '{teacherId}',
        to_jsonb('UNISTAFF-' || (entry->>'teacherId'))
      )
      ELSE entry
    END
  )
  FROM jsonb_array_elements("schedule") AS entry
)
WHERE jsonb_array_length("schedule") > 0;

-- ============================================================
-- 4. action_history — entity_id + JSON snapshots
-- ============================================================

-- 4a. entity_id column (plain text FK-like reference)
UPDATE "action_history"
SET "entity_id" = 'UNIST-' || "entity_id"
WHERE "entity_type" = 'student'
  AND "entity_id" NOT LIKE 'UNIST-%';

UPDATE "action_history"
SET "entity_id" = 'UNISTAFF-' || "entity_id"
WHERE "entity_type" = 'staff'
  AND "entity_id" NOT LIKE 'UNISTAFF-%';

UPDATE "action_history"
SET "entity_id" = 'UNICL-' || "entity_id"
WHERE "entity_type" = 'class'
  AND "entity_id" NOT LIKE 'UNICL-%';

-- 4b. before_value / after_value JSON snapshots
--    Replace bare UUIDs at known paths (id, studentId, classId, teacherId).
--    Using text replace on the serialised JSON; safe because the UUID pattern
--    is long and unlikely to appear as part of any other string value.
--    We only touch rows where entity_type is one of the three affected types.

UPDATE "action_history"
SET "before_value" = replace(
      replace(
        replace("before_value"::text,
          '"id": "' || regexp_replace("entity_id", '^UNIST-', '') || '"',
          '"id": "' || "entity_id" || '"'
        ),
        '"studentId": "' || regexp_replace("entity_id", '^UNIST-', '') || '"',
        '"studentId": "' || "entity_id" || '"'
      ),
      '"student_id": "' || regexp_replace("entity_id", '^UNIST-', '') || '"',
      '"student_id": "' || "entity_id" || '"'
    )::jsonb
WHERE "entity_type" = 'student'
  AND "before_value" IS NOT NULL;

UPDATE "action_history"
SET "after_value" = replace(
      replace(
        replace("after_value"::text,
          '"id": "' || regexp_replace("entity_id", '^UNIST-', '') || '"',
          '"id": "' || "entity_id" || '"'
        ),
        '"studentId": "' || regexp_replace("entity_id", '^UNIST-', '') || '"',
        '"studentId": "' || "entity_id" || '"'
      ),
      '"student_id": "' || regexp_replace("entity_id", '^UNIST-', '') || '"',
      '"student_id": "' || "entity_id" || '"'
    )::jsonb
WHERE "entity_type" = 'student'
  AND "after_value" IS NOT NULL;

UPDATE "action_history"
SET "before_value" = replace(
      replace(
        replace("before_value"::text,
          '"id": "' || regexp_replace("entity_id", '^UNISTAFF-', '') || '"',
          '"id": "' || "entity_id" || '"'
        ),
        '"staffId": "' || regexp_replace("entity_id", '^UNISTAFF-', '') || '"',
        '"staffId": "' || "entity_id" || '"'
      ),
      '"teacherId": "' || regexp_replace("entity_id", '^UNISTAFF-', '') || '"',
      '"teacherId": "' || "entity_id" || '"'
    )::jsonb
WHERE "entity_type" = 'staff'
  AND "before_value" IS NOT NULL;

UPDATE "action_history"
SET "after_value" = replace(
      replace(
        replace("after_value"::text,
          '"id": "' || regexp_replace("entity_id", '^UNISTAFF-', '') || '"',
          '"id": "' || "entity_id" || '"'
        ),
        '"staffId": "' || regexp_replace("entity_id", '^UNISTAFF-', '') || '"',
        '"staffId": "' || "entity_id" || '"'
      ),
      '"teacherId": "' || regexp_replace("entity_id", '^UNISTAFF-', '') || '"',
      '"teacherId": "' || "entity_id" || '"'
    )::jsonb
WHERE "entity_type" = 'staff'
  AND "after_value" IS NOT NULL;

UPDATE "action_history"
SET "before_value" = replace(
      replace("before_value"::text,
        '"id": "' || regexp_replace("entity_id", '^UNICL-', '') || '"',
        '"id": "' || "entity_id" || '"'
      ),
      '"classId": "' || regexp_replace("entity_id", '^UNICL-', '') || '"',
      '"classId": "' || "entity_id" || '"'
    )::jsonb
WHERE "entity_type" = 'class'
  AND "before_value" IS NOT NULL;

UPDATE "action_history"
SET "after_value" = replace(
      replace("after_value"::text,
        '"id": "' || regexp_replace("entity_id", '^UNICL-', '') || '"',
        '"id": "' || "entity_id" || '"'
      ),
      '"classId": "' || regexp_replace("entity_id", '^UNICL-', '') || '"',
      '"classId": "' || "entity_id" || '"'
    )::jsonb
WHERE "entity_type" = 'class'
  AND "after_value" IS NOT NULL;

-- ============================================================
-- 5. student_wallet_sepay_orders.transfer_note
--    Format: "NAPVI <studentId> <classId1> [<classId2> ...]"
--    Replace bare UUIDs in the note with prefixed equivalents.
-- ============================================================
UPDATE "student_wallet_sepay_orders"
SET "transfer_note" = regexp_replace(
  regexp_replace(
    "transfer_note",
    '([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?=\s+UNICL-|\s*$)',
    'UNIST-\1',
    'gi'
  ),
  '(?<=UNIST-[0-9a-f-]{36}\s)([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})',
  'UNICL-\1',
  'gi'
)
WHERE "transfer_note" LIKE 'NAPVI %'
  AND "transfer_note" NOT LIKE '%UNIST-%';

-- ============================================================
-- 6. dashboard_cache — truncate (safe; cache rebuilds on next request)
-- ============================================================
DELETE FROM "dashboard_cache";

COMMIT;
