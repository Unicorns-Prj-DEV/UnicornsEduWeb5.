-- CreateEnum
CREATE TYPE "StudentClassStatus" AS ENUM ('active', 'inactive');

-- AlterTable
ALTER TABLE "student_classes" ADD COLUMN     "status" "StudentClassStatus";
