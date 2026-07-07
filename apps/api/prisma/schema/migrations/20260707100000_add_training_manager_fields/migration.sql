-- Add class training manager configuration and session-level snapshots.

ALTER TABLE "classes"
ADD COLUMN IF NOT EXISTS "training_manager_staff_id" TEXT,
ADD COLUMN IF NOT EXISTS "training_manager_rate_percent" DECIMAL(5, 2);

ALTER TABLE "sessions"
ADD COLUMN IF NOT EXISTS "training_manager_staff_id" TEXT,
ADD COLUMN IF NOT EXISTS "training_manager_rate_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "training_manager_allowance_amount" INTEGER,
ADD COLUMN IF NOT EXISTS "training_manager_payment_status" "PaymentStatus",
ADD COLUMN IF NOT EXISTS "training_manager_tax_deduction_rate_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'classes_training_manager_staff_id_fkey'
  ) THEN
    ALTER TABLE "classes"
    ADD CONSTRAINT "classes_training_manager_staff_id_fkey"
    FOREIGN KEY ("training_manager_staff_id")
    REFERENCES "staff_info"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sessions_training_manager_staff_id_fkey'
  ) THEN
    ALTER TABLE "sessions"
    ADD CONSTRAINT "sessions_training_manager_staff_id_fkey"
    FOREIGN KEY ("training_manager_staff_id")
    REFERENCES "staff_info"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "classes_training_manager_staff_id_idx"
ON "classes"("training_manager_staff_id");

CREATE INDEX IF NOT EXISTS "sessions_training_manager_staff_id_training_manager_payment_status_idx"
ON "sessions"("training_manager_staff_id", "training_manager_payment_status");
