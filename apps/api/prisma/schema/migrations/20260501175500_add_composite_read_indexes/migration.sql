-- Composite indexes for hot read paths in session/payroll/history flows.
CREATE INDEX "student_classes_class_id_student_id_idx"
ON "student_classes"("class_id", "student_id");

CREATE INDEX "student_classes_student_id_class_id_idx"
ON "student_classes"("student_id", "class_id");

CREATE INDEX "bonuses_staff_id_month_status_idx"
ON "bonuses"("staff_id", "month", "status");

CREATE INDEX "wallet_transactions_history_student_id_created_at_idx"
ON "wallet_transactions_history"("student_id", "created_at");

CREATE INDEX "extra_allowances_staff_id_month_status_idx"
ON "extra_allowances"("staff_id", "month", "status");

CREATE INDEX "action_history_entity_type_entity_id_created_at_idx"
ON "action_history"("entity_type", "entity_id", "created_at");

CREATE INDEX "action_history_entity_type_action_type_created_at_idx"
ON "action_history"("entity_type", "action_type", "created_at");

CREATE INDEX "action_history_user_id_created_at_idx"
ON "action_history"("user_id", "created_at");
