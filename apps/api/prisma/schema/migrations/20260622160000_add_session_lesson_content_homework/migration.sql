-- Add structured session comment fields for lesson content and homework.
ALTER TABLE "sessions"
ADD COLUMN "lesson_content" TEXT,
ADD COLUMN "homework" TEXT;

-- Backfill legacy session notes into lesson_content where possible.
UPDATE "sessions"
SET "lesson_content" = "notes"
WHERE "lesson_content" IS NULL
  AND "notes" IS NOT NULL
  AND BTRIM("notes") <> '';
