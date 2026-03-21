-- DropForeignKey
ALTER TABLE "lesson_task" DROP CONSTRAINT "lesson_task_lesson_outputs_id_fkey";

-- DropIndex
DROP INDEX "lesson_task_lesson_outputs_id_key";

-- AlterTable
ALTER TABLE "lesson_outputs" ADD COLUMN "lesson_task_id" TEXT;

-- Backfill
UPDATE "lesson_outputs" AS output
SET "lesson_task_id" = task."id"
FROM "lesson_task" AS task
WHERE task."lesson_outputs_id" = output."id";

-- AlterTable
ALTER TABLE "lesson_task" DROP COLUMN "lesson_outputs_id";

-- CreateIndex
CREATE INDEX "lesson_outputs_lesson_task_id_idx" ON "lesson_outputs"("lesson_task_id");

-- CreateIndex
CREATE INDEX "lesson_outputs_lesson_task_id_status_idx" ON "lesson_outputs"("lesson_task_id", "status");

-- CreateIndex
CREATE INDEX "lesson_outputs_lesson_task_id_date_idx" ON "lesson_outputs"("lesson_task_id", "date");

-- AddForeignKey
ALTER TABLE "lesson_outputs" ADD CONSTRAINT "lesson_outputs_lesson_task_id_fkey" FOREIGN KEY ("lesson_task_id") REFERENCES "lesson_task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
