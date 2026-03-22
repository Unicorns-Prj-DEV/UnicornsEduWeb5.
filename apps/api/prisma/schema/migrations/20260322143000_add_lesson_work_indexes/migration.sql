-- CreateIndex
CREATE INDEX "lesson_outputs_date_idx" ON "lesson_outputs"("date");

-- CreateIndex
CREATE INDEX "lesson_outputs_status_date_idx" ON "lesson_outputs"("status", "date");

-- CreateIndex
CREATE INDEX "lesson_outputs_staff_id_date_idx" ON "lesson_outputs"("staff_id", "date");

-- CreateIndex
CREATE INDEX "lesson_outputs_updated_at_idx" ON "lesson_outputs"("updated_at");
