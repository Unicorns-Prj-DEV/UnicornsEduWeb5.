-- Ensure bonuses.date exists and is populated from created_at.
ALTER TABLE "bonuses"
ADD COLUMN IF NOT EXISTS "date" DATE NOT NULL DEFAULT CURRENT_DATE;

-- Backfill all existing rows using created_at calendar day.
UPDATE "bonuses"
SET "date" = ("created_at" AT TIME ZONE 'UTC')::DATE;
