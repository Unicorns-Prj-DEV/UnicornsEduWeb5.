-- CreateEnum
CREATE TYPE "StudentDropOutReasonGroup" AS ENUM ('exam_done', 'changed_direction', 'busy_schedule', 'no_suitable_class', 'trial_only', 'tuition', 'other');

-- AlterTable
ALTER TABLE "student_info" ADD COLUMN "drop_out_reason_group" "StudentDropOutReasonGroup";
