-- AlterTable: add CCCD fields for staff profile
ALTER TABLE "staff_info"
ADD COLUMN "cccd_number" TEXT,
ADD COLUMN "cccd_issued_date" DATE,
ADD COLUMN "cccd_issued_place" TEXT;

-- Backfill existing rows with unique placeholder CCCD numbers
WITH numbered_staff AS (
  SELECT
    id,
    LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::text, 6, '0') AS seq
  FROM "staff_info"
  WHERE "cccd_number" IS NULL
)
UPDATE "staff_info" AS staff
SET "cccd_number" = '999999' || numbered_staff.seq
FROM numbered_staff
WHERE staff.id = numbered_staff.id;

-- Enforce required + unique CCCD number
ALTER TABLE "staff_info"
ALTER COLUMN "cccd_number" SET NOT NULL;

CREATE UNIQUE INDEX "staff_info_cccd_number_key" ON "staff_info"("cccd_number");
