ALTER TABLE "staff_info"
ADD COLUMN "ethnicity" TEXT,
ADD COLUMN "gender" "Gender",
ADD COLUMN "current_address" TEXT,
DROP COLUMN "cccd_front_path",
DROP COLUMN "cccd_back_path",
DROP COLUMN "cccd_verified_at";
