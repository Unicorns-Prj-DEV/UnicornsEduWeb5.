-- Low-risk indexes for researched hot read paths.

CREATE INDEX IF NOT EXISTS "student_classes_class_id_status_created_at_idx"
ON "student_classes"("class_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "sessions_class_id_teacher_id_date_idx"
ON "sessions"("class_id", "teacher_id", "date");

CREATE INDEX IF NOT EXISTS "sessions_teacher_payment_status_date_teacher_id_idx"
ON "sessions"("teacher_payment_status", "date", "teacher_id");

CREATE INDEX IF NOT EXISTS "attendance_cc_staff_payment_session_idx"
ON "attendance"("customer_care_staff_id", "customer_care_payment_status", "session_id");

CREATE INDEX IF NOT EXISTS "attendance_customer_care_staff_id_student_id_session_id_idx"
ON "attendance"("customer_care_staff_id", "student_id", "session_id");

CREATE INDEX IF NOT EXISTS "attendance_assistant_staff_payment_session_idx"
ON "attendance"("assistant_manager_staff_id", "assistant_payment_status", "session_id");

CREATE INDEX IF NOT EXISTS "bonuses_status_date_staff_id_idx"
ON "bonuses"("status", "date", "staff_id");

CREATE INDEX IF NOT EXISTS "wallet_transactions_history_type_created_at_idx"
ON "wallet_transactions_history"("type", "created_at");

CREATE INDEX IF NOT EXISTS "dashboard_cache_expires_at_idx"
ON "dashboard_cache"("expires_at");

CREATE INDEX IF NOT EXISTS "cost_extend_date_idx"
ON "cost_extend"("date");

CREATE INDEX IF NOT EXISTS "cost_extend_month_idx"
ON "cost_extend"("month");

CREATE INDEX IF NOT EXISTS "cost_extend_status_date_idx"
ON "cost_extend"("status", "date");

CREATE INDEX IF NOT EXISTS "extra_allowances_status_staff_month_role_tax_idx"
ON "extra_allowances"("status", "staff_id", "month", "role_type", "tax_deduction_rate_percent");

CREATE INDEX IF NOT EXISTS "lesson_outputs_payment_status_date_staff_id_idx"
ON "lesson_outputs"("payment_status", "date", "staff_id");

CREATE INDEX IF NOT EXISTS "class_surveys_class_id_test_number_idx"
ON "class_surveys"("class_id", "test_number");

CREATE INDEX IF NOT EXISTS "class_surveys_teacher_id_report_date_idx"
ON "class_surveys"("teacher_id", "report_date");

CREATE INDEX IF NOT EXISTS "users_created_at_idx"
ON "users"("created_at");

CREATE INDEX IF NOT EXISTS "staff_info_roles_gin_idx"
ON "staff_info" USING GIN ("roles");

CREATE INDEX IF NOT EXISTS "notifications_target_role_types_gin_idx"
ON "notifications" USING GIN ("target_role_types");

CREATE INDEX IF NOT EXISTS "notifications_target_staff_roles_gin_idx"
ON "notifications" USING GIN ("target_staff_roles");

CREATE INDEX IF NOT EXISTS "notifications_target_user_ids_gin_idx"
ON "notifications" USING GIN ("target_user_ids");

CREATE INDEX IF NOT EXISTS "regulations_audiences_gin_idx"
ON "regulations" USING GIN ("audiences");
