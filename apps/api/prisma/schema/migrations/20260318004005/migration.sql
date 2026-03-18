/*
  Warnings:

  - A unique constraint covering the columns `[transaction_id]` on the table `attendance` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "users_link_id_idx";

-- DropIndex
DROP INDEX "users_phone_idx";

-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "transaction_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "attendance_transaction_id_key" ON "attendance"("transaction_id");

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "wallet_transactions_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;
