-- CreateEnum
CREATE TYPE "StudentWalletSepayOrderStatus" AS ENUM ('pending', 'completed', 'expired', 'cancelled', 'failed');

-- AlterTable
ALTER TABLE "student_info" ADD COLUMN "parent_email" TEXT;

-- CreateTable
CREATE TABLE "student_wallet_sepay_orders" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "order_code" TEXT NOT NULL,
    "status" "StudentWalletSepayOrderStatus" NOT NULL DEFAULT 'pending',
    "amount_requested" INTEGER NOT NULL,
    "amount_received" INTEGER,
    "transfer_note" TEXT NOT NULL,
    "parent_email" TEXT,
    "sepay_order_id" TEXT,
    "sepay_order_status" TEXT,
    "sepay_va_number" TEXT,
    "sepay_va_holder_name" TEXT,
    "sepay_bank_name" TEXT,
    "sepay_account_number" TEXT,
    "sepay_account_holder_name" TEXT,
    "sepay_qr_code" TEXT,
    "sepay_qr_code_url" TEXT,
    "sepay_expired_at" TIMESTAMPTZ,
    "sepay_transaction_id" TEXT,
    "sepay_reference_code" TEXT,
    "wallet_transaction_id" TEXT,
    "completed_at" TIMESTAMPTZ,
    "receipt_email_sent_at" TIMESTAMPTZ,
    "webhook_payload" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_wallet_sepay_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_wallet_sepay_orders_order_code_key" ON "student_wallet_sepay_orders"("order_code");

-- CreateIndex
CREATE UNIQUE INDEX "student_wallet_sepay_orders_sepay_transaction_id_key" ON "student_wallet_sepay_orders"("sepay_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_wallet_sepay_orders_sepay_reference_code_key" ON "student_wallet_sepay_orders"("sepay_reference_code");

-- CreateIndex
CREATE UNIQUE INDEX "student_wallet_sepay_orders_wallet_transaction_id_key" ON "student_wallet_sepay_orders"("wallet_transaction_id");

-- CreateIndex
CREATE INDEX "student_wallet_sepay_orders_student_id_idx" ON "student_wallet_sepay_orders"("student_id");

-- CreateIndex
CREATE INDEX "student_wallet_sepay_orders_status_created_at_idx" ON "student_wallet_sepay_orders"("status", "created_at");

-- AddForeignKey
ALTER TABLE "student_wallet_sepay_orders" ADD CONSTRAINT "student_wallet_sepay_orders_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_wallet_sepay_orders" ADD CONSTRAINT "student_wallet_sepay_orders_wallet_transaction_id_fkey" FOREIGN KEY ("wallet_transaction_id") REFERENCES "wallet_transactions_history"("id") ON DELETE SET NULL ON UPDATE CASCADE;
