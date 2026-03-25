DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'attendance_customer_care_staff_id_customer_care_payment_status_'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'attendance_customer_care_staff_id_customer_care_payment_sta_idx'
  ) THEN
    EXECUTE 'CREATE INDEX "attendance_customer_care_staff_id_customer_care_payment_status_" ON "attendance"("customer_care_staff_id", "customer_care_payment_status")';
  END IF;
END $$;
