/*
  Warnings:

  - The `roles` column on the `staff_info` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('admin', 'teacher', 'lesson_plan', 'lesson_plan_head', 'accountant', 'communication', 'communication_head', 'customer_care', 'customer_care_head');

-- AlterTable
ALTER TABLE "staff_info" DROP COLUMN "roles",
ADD COLUMN     "roles" "StaffRole"[] DEFAULT ARRAY[]::"StaffRole"[];

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "staff_id" TEXT,
ADD COLUMN     "student_id" TEXT;

-- CreateIndex
CREATE INDEX "users_staff_id_idx" ON "users"("staff_id");

-- CreateIndex
CREATE INDEX "users_student_id_idx" ON "users"("student_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_info"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_info"("id") ON DELETE SET NULL ON UPDATE CASCADE;
