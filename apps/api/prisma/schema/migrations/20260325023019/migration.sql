/*
  Warnings:

  - The `role_type` column on the `extra_allowances` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "extra_allowances" DROP COLUMN "role_type",
ADD COLUMN     "role_type" "StaffRole" NOT NULL DEFAULT 'teacher';

-- CreateIndex
CREATE INDEX "extra_allowances_role_type_idx" ON "extra_allowances"("role_type");
