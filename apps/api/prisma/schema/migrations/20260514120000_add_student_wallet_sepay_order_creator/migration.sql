ALTER TABLE "student_wallet_sepay_orders"
ADD COLUMN "created_by_user_id" TEXT,
ADD COLUMN "created_by_user_email" TEXT,
ADD COLUMN "created_by_role_type" "UserRole",
ADD COLUMN "created_by_staff_roles" JSONB;

CREATE INDEX "student_wallet_sepay_orders_created_by_user_id_idx"
ON "student_wallet_sepay_orders"("created_by_user_id");

ALTER TABLE "student_wallet_sepay_orders"
ADD CONSTRAINT "student_wallet_sepay_orders_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
