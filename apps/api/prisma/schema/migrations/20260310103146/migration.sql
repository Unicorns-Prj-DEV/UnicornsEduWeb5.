/*
  Warnings:

  - You are about to drop the column `staff_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `student_id` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "staff_id",
DROP COLUMN "student_id";
