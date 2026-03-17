/*
  Warnings:

  - You are about to drop the `cf_group_configs` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "student_info" ADD COLUMN     "account_balance" INTEGER DEFAULT 0;

-- DropTable
DROP TABLE "cf_group_configs";
