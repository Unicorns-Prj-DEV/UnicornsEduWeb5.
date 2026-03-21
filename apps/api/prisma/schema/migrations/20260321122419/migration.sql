-- AddForeignKey
ALTER TABLE "lesson_outputs" ADD CONSTRAINT "lesson_outputs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_info"("id") ON DELETE SET NULL ON UPDATE CASCADE;
