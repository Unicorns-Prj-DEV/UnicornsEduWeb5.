/*
  Warnings:

  - The primary key for the `class_teacher_operating_deduction_rates` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `role_tax_deduction_rates` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `staff_tax_deduction_overrides` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropIndex
DROP INDEX "notifications_target_role_types_gin_idx";

-- DropIndex
DROP INDEX "notifications_target_staff_roles_gin_idx";

-- DropIndex
DROP INDEX "notifications_target_user_ids_gin_idx";

-- AlterTable
ALTER TABLE "class_teacher_operating_deduction_rates" DROP CONSTRAINT "class_teacher_operating_deduction_rates_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "updated_at" DROP DEFAULT,
ADD CONSTRAINT "class_teacher_operating_deduction_rates_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "makeup_schedule_events" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "role_tax_deduction_rates" DROP CONSTRAINT "role_tax_deduction_rates_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "updated_at" DROP DEFAULT,
ADD CONSTRAINT "role_tax_deduction_rates_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "staff_tax_deduction_overrides" DROP CONSTRAINT "staff_tax_deduction_overrides_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "updated_at" DROP DEFAULT,
ADD CONSTRAINT "staff_tax_deduction_overrides_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "student_exam_schedules" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "class_teacher_operating_deduction_rates_class_id_teacher_id_idx" ON "class_teacher_operating_deduction_rates"("class_id", "teacher_id", "effective_from");

-- CreateIndex
CREATE INDEX "staff_tax_deduction_overrides_staff_id_role_type_effective__idx" ON "staff_tax_deduction_overrides"("staff_id", "role_type", "effective_from");

-- RenameIndex
ALTER INDEX "class_teacher_operating_deduction_rates_class_id_teacher_id_eff" RENAME TO "class_teacher_operating_deduction_rates_class_id_teacher_id_key";

-- RenameIndex
ALTER INDEX "class_teacher_operating_deduction_rates_teacher_id_effective_fr" RENAME TO "class_teacher_operating_deduction_rates_teacher_id_effectiv_idx";

-- RenameIndex
ALTER INDEX "sessions_googleCalendarEventId_idx" RENAME TO "sessions_google_calendar_event_id_idx";

-- RenameIndex
ALTER INDEX "staff_tax_deduction_overrides_staff_id_role_type_effective_from" RENAME TO "staff_tax_deduction_overrides_staff_id_role_type_effective__key";
