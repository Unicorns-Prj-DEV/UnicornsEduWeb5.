CREATE TYPE "StudentWalletDirectTopUpRequestStatus" AS ENUM ('pending', 'approved', 'expired');

CREATE TABLE "student_wallet_direct_topup_requests" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "student_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "StudentWalletDirectTopUpRequestStatus" NOT NULL DEFAULT 'pending',
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "approved_at" TIMESTAMPTZ(6),
    "wallet_transaction_id" TEXT,
    "requested_by_user_id" TEXT,
    "requested_by_user_email" TEXT,
    "requested_by_role_type" "UserRole",
    "requested_by_staff_roles" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_wallet_direct_topup_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_wallet_direct_topup_requests_token_hash_key"
ON "student_wallet_direct_topup_requests"("token_hash");

CREATE UNIQUE INDEX "student_wallet_direct_topup_requests_wallet_transaction_id_key"
ON "student_wallet_direct_topup_requests"("wallet_transaction_id");

CREATE INDEX "student_wallet_direct_topup_requests_student_id_idx"
ON "student_wallet_direct_topup_requests"("student_id");

CREATE INDEX "student_wallet_direct_topup_requests_status_expires_at_idx"
ON "student_wallet_direct_topup_requests"("status", "expires_at");

CREATE INDEX "student_wallet_direct_topup_requests_requested_by_user_id_idx"
ON "student_wallet_direct_topup_requests"("requested_by_user_id");

ALTER TABLE "student_wallet_direct_topup_requests"
ADD CONSTRAINT "student_wallet_direct_topup_requests_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "student_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_wallet_direct_topup_requests"
ADD CONSTRAINT "student_wallet_direct_topup_requests_wallet_transaction_id_fkey"
FOREIGN KEY ("wallet_transaction_id") REFERENCES "wallet_transactions_history"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "student_wallet_direct_topup_requests"
ADD CONSTRAINT "student_wallet_direct_topup_requests_requested_by_user_id_fkey"
FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
