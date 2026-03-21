-- CreateEnum
CREATE TYPE "LessonOutputStatus" AS ENUM ('pending', 'completed', 'cancelled');

-- AlterTable
ALTER TABLE "lesson_outputs" ADD COLUMN     "status" "LessonOutputStatus" NOT NULL DEFAULT 'pending';
