-- Migration: short_system_entity_ids
--
-- Rotates student_info, staff_info, and classes primary keys to compact system IDs:
--   student_info: UNIST-[0-9a-f]{10}
--   classes:      UNICL-[0-9a-f]{10}
--   staff_info:   UNISTAFF-[0-9a-f]{10}
--
-- Existing rows receive freshly generated 5-byte hex IDs from pgcrypto. The new IDs
-- are not derived from old UUIDs/prefixed UUIDs. Direct FK children rely on existing
-- ON UPDATE CASCADE constraints; JSON/text denormalized references are backfilled below.
-- No rollback migration is provided; fix forward if an environment needs repair.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TEMP TABLE "_student_short_id_map" (
  "old_id" TEXT PRIMARY KEY,
  "new_id" TEXT
) ON COMMIT DROP;

CREATE TEMP TABLE "_staff_short_id_map" (
  "old_id" TEXT PRIMARY KEY,
  "new_id" TEXT
) ON COMMIT DROP;

CREATE TEMP TABLE "_class_short_id_map" (
  "old_id" TEXT PRIMARY KEY,
  "new_id" TEXT
) ON COMMIT DROP;

INSERT INTO "_student_short_id_map" ("old_id")
SELECT "id" FROM "student_info";

INSERT INTO "_staff_short_id_map" ("old_id")
SELECT "id" FROM "staff_info";

INSERT INTO "_class_short_id_map" ("old_id")
SELECT "id" FROM "classes";

DO $$
DECLARE
  remaining INTEGER;
  attempts INTEGER := 0;
BEGIN
  LOOP
    attempts := attempts + 1;

    UPDATE "_student_short_id_map"
    SET "new_id" = 'UNIST-' || encode(gen_random_bytes(5), 'hex')
    WHERE "new_id" IS NULL;

    WITH duplicate_values AS (
      SELECT "new_id"
      FROM "_student_short_id_map"
      WHERE "new_id" IS NOT NULL
      GROUP BY "new_id"
      HAVING COUNT(*) > 1
    ),
    old_id_conflicts AS (
      SELECT generated."new_id"
      FROM "_student_short_id_map" AS generated
      JOIN "_student_short_id_map" AS existing
        ON existing."old_id" = generated."new_id"
      WHERE generated."new_id" IS NOT NULL
    ),
    bad_values AS (
      SELECT "new_id" FROM duplicate_values
      UNION
      SELECT "new_id" FROM old_id_conflicts
    )
    UPDATE "_student_short_id_map" AS map
    SET "new_id" = NULL
    FROM bad_values
    WHERE map."new_id" = bad_values."new_id";

    SELECT COUNT(*) INTO remaining
    FROM "_student_short_id_map"
    WHERE "new_id" IS NULL;

    EXIT WHEN remaining = 0;

    IF attempts >= 100 THEN
      RAISE EXCEPTION 'short_system_entity_ids: could not generate collision-free student IDs after % attempts', attempts;
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  remaining INTEGER;
  attempts INTEGER := 0;
BEGIN
  LOOP
    attempts := attempts + 1;

    UPDATE "_staff_short_id_map"
    SET "new_id" = 'UNISTAFF-' || encode(gen_random_bytes(5), 'hex')
    WHERE "new_id" IS NULL;

    WITH duplicate_values AS (
      SELECT "new_id"
      FROM "_staff_short_id_map"
      WHERE "new_id" IS NOT NULL
      GROUP BY "new_id"
      HAVING COUNT(*) > 1
    ),
    old_id_conflicts AS (
      SELECT generated."new_id"
      FROM "_staff_short_id_map" AS generated
      JOIN "_staff_short_id_map" AS existing
        ON existing."old_id" = generated."new_id"
      WHERE generated."new_id" IS NOT NULL
    ),
    bad_values AS (
      SELECT "new_id" FROM duplicate_values
      UNION
      SELECT "new_id" FROM old_id_conflicts
    )
    UPDATE "_staff_short_id_map" AS map
    SET "new_id" = NULL
    FROM bad_values
    WHERE map."new_id" = bad_values."new_id";

    SELECT COUNT(*) INTO remaining
    FROM "_staff_short_id_map"
    WHERE "new_id" IS NULL;

    EXIT WHEN remaining = 0;

    IF attempts >= 100 THEN
      RAISE EXCEPTION 'short_system_entity_ids: could not generate collision-free staff IDs after % attempts', attempts;
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  remaining INTEGER;
  attempts INTEGER := 0;
BEGIN
  LOOP
    attempts := attempts + 1;

    UPDATE "_class_short_id_map"
    SET "new_id" = 'UNICL-' || encode(gen_random_bytes(5), 'hex')
    WHERE "new_id" IS NULL;

    WITH duplicate_values AS (
      SELECT "new_id"
      FROM "_class_short_id_map"
      WHERE "new_id" IS NOT NULL
      GROUP BY "new_id"
      HAVING COUNT(*) > 1
    ),
    old_id_conflicts AS (
      SELECT generated."new_id"
      FROM "_class_short_id_map" AS generated
      JOIN "_class_short_id_map" AS existing
        ON existing."old_id" = generated."new_id"
      WHERE generated."new_id" IS NOT NULL
    ),
    bad_values AS (
      SELECT "new_id" FROM duplicate_values
      UNION
      SELECT "new_id" FROM old_id_conflicts
    )
    UPDATE "_class_short_id_map" AS map
    SET "new_id" = NULL
    FROM bad_values
    WHERE map."new_id" = bad_values."new_id";

    SELECT COUNT(*) INTO remaining
    FROM "_class_short_id_map"
    WHERE "new_id" IS NULL;

    EXIT WHEN remaining = 0;

    IF attempts >= 100 THEN
      RAISE EXCEPTION 'short_system_entity_ids: could not generate collision-free class IDs after % attempts', attempts;
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "_student_short_id_map"
    WHERE "new_id" !~ '^UNIST-[0-9a-f]{10}$'
  ) THEN
    RAISE EXCEPTION 'short_system_entity_ids: generated invalid student ID';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "_staff_short_id_map"
    WHERE "new_id" !~ '^UNISTAFF-[0-9a-f]{10}$'
  ) THEN
    RAISE EXCEPTION 'short_system_entity_ids: generated invalid staff ID';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "_class_short_id_map"
    WHERE "new_id" !~ '^UNICL-[0-9a-f]{10}$'
  ) THEN
    RAISE EXCEPTION 'short_system_entity_ids: generated invalid class ID';
  END IF;
END $$;

CREATE UNIQUE INDEX "_student_short_id_map_new_id_key"
ON "_student_short_id_map" ("new_id");

CREATE UNIQUE INDEX "_staff_short_id_map_new_id_key"
ON "_staff_short_id_map" ("new_id");

CREATE UNIQUE INDEX "_class_short_id_map_new_id_key"
ON "_class_short_id_map" ("new_id");

-- Primary key rotation. Existing FK constraints use ON UPDATE CASCADE.
UPDATE "student_info" AS student
SET "id" = map."new_id"
FROM "_student_short_id_map" AS map
WHERE student."id" = map."old_id";

UPDATE "staff_info" AS staff
SET "id" = map."new_id"
FROM "_staff_short_id_map" AS map
WHERE staff."id" = map."old_id";

UPDATE "classes" AS cls
SET "id" = map."new_id"
FROM "_class_short_id_map" AS map
WHERE cls."id" = map."old_id";

-- users.link_id is a legacy text reference, not a declared FK. Keep it aligned
-- where environments still carry profile IDs in that column.
UPDATE "users" AS users
SET "link_id" = map."new_id"
FROM "_student_short_id_map" AS map
WHERE users."link_id" = map."old_id";

UPDATE "users" AS users
SET "link_id" = map."new_id"
FROM "_staff_short_id_map" AS map
WHERE users."link_id" = map."old_id";

-- Denormalized schedule JSON: replace any embedded staff/class/student IDs that were
-- serialized into classes.schedule. The expected hot path is schedule[*].teacherId.
DO $$
DECLARE
  replacement RECORD;
BEGIN
  FOR replacement IN
    SELECT "old_id", "new_id" FROM "_student_short_id_map"
    UNION ALL
    SELECT "old_id", "new_id" FROM "_staff_short_id_map"
    UNION ALL
    SELECT "old_id", "new_id" FROM "_class_short_id_map"
  LOOP
    UPDATE "classes"
    SET "schedule" = replace("schedule"::text, replacement."old_id", replacement."new_id")::jsonb
    WHERE "schedule"::text LIKE '%' || replacement."old_id" || '%';
  END LOOP;
END $$;

-- Audit entity_id is text, not a FK.
UPDATE "action_history" AS history
SET "entity_id" = map."new_id"
FROM "_student_short_id_map" AS map
WHERE history."entity_id" = map."old_id";

UPDATE "action_history" AS history
SET "entity_id" = map."new_id"
FROM "_staff_short_id_map" AS map
WHERE history."entity_id" = map."old_id";

UPDATE "action_history" AS history
SET "entity_id" = map."new_id"
FROM "_class_short_id_map" AS map
WHERE history."entity_id" = map."old_id";

-- Audit snapshots can contain any of the old IDs in before_value, after_value, or
-- changed_fields, including cross-entity references. Replace every mapped ID.
DO $$
DECLARE
  replacement RECORD;
BEGIN
  FOR replacement IN
    SELECT "old_id", "new_id" FROM "_student_short_id_map"
    UNION ALL
    SELECT "old_id", "new_id" FROM "_staff_short_id_map"
    UNION ALL
    SELECT "old_id", "new_id" FROM "_class_short_id_map"
  LOOP
    UPDATE "action_history"
    SET "before_value" = replace("before_value"::text, replacement."old_id", replacement."new_id")::jsonb
    WHERE "before_value" IS NOT NULL
      AND "before_value"::text LIKE '%' || replacement."old_id" || '%';

    UPDATE "action_history"
    SET "after_value" = replace("after_value"::text, replacement."old_id", replacement."new_id")::jsonb
    WHERE "after_value" IS NOT NULL
      AND "after_value"::text LIKE '%' || replacement."old_id" || '%';

    UPDATE "action_history"
    SET "changed_fields" = replace("changed_fields"::text, replacement."old_id", replacement."new_id")::jsonb
    WHERE "changed_fields" IS NOT NULL
      AND "changed_fields"::text LIKE '%' || replacement."old_id" || '%';
  END LOOP;
END $$;

-- Existing SePay transfer notes / QR payloads are external references and may embed
-- old student/class IDs. Replace mapped IDs in persisted order notes for audit and
-- reconcile compatibility; active static QR images must still be reissued after deploy.
DO $$
DECLARE
  replacement RECORD;
BEGIN
  FOR replacement IN
    SELECT "old_id", "new_id" FROM "_student_short_id_map"
    UNION ALL
    SELECT "old_id", "new_id" FROM "_class_short_id_map"
  LOOP
    UPDATE "student_wallet_sepay_orders"
    SET "transfer_note" = replace("transfer_note", replacement."old_id", replacement."new_id")
    WHERE "transfer_note" LIKE '%' || replacement."old_id" || '%';
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "student_info" WHERE "id" !~ '^UNIST-[0-9a-f]{10}$') THEN
    RAISE EXCEPTION 'short_system_entity_ids: student_info contains non-short ID after migration';
  END IF;

  IF EXISTS (SELECT 1 FROM "staff_info" WHERE "id" !~ '^UNISTAFF-[0-9a-f]{10}$') THEN
    RAISE EXCEPTION 'short_system_entity_ids: staff_info contains non-short ID after migration';
  END IF;

  IF EXISTS (SELECT 1 FROM "classes" WHERE "id" !~ '^UNICL-[0-9a-f]{10}$') THEN
    RAISE EXCEPTION 'short_system_entity_ids: classes contains non-short ID after migration';
  END IF;
END $$;

-- Dashboard data contains denormalized IDs and is cheap to rebuild.
DO $$
BEGIN
  IF to_regclass('public.dashboard_cache') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE "dashboard_cache"';
  END IF;
END $$;

COMMIT;
