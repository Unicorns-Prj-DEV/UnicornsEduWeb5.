/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `staff_info` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "notifications_target_role_types_gin_idx";

-- DropIndex
DROP INDEX "notifications_target_staff_roles_gin_idx";

-- DropIndex
DROP INDEX "notifications_target_user_ids_gin_idx";

-- DropIndex
DROP INDEX "regulations_audiences_gin_idx";

-- DropIndex
DROP INDEX "staff_info_roles_gin_idx";

-- DropIndex
DROP INDEX "staff_info_user_id_key";

-- AlterTable
ALTER TABLE "bonuses" ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "staff_info_user_id_key" ON "staff_info"("user_id");
