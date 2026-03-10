/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `staff_info` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id]` on the table `student_info` will be added. If there are existing duplicate values, this will fail.
  - Made the column `password_hash` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_staff_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_student_id_fkey";

-- AlterTable
ALTER TABLE "staff_info" ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "student_info" ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "staff_info_user_id_key" ON "staff_info"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_info_user_id_key" ON "student_info"("user_id");

-- AddForeignKey
ALTER TABLE "staff_info" ADD CONSTRAINT "staff_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_info" ADD CONSTRAINT "student_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
