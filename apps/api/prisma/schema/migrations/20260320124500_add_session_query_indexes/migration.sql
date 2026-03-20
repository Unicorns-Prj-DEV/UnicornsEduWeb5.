CREATE INDEX IF NOT EXISTS "sessions_class_id_date_idx"
ON "sessions" ("class_id", "date");

CREATE INDEX IF NOT EXISTS "sessions_teacher_id_date_idx"
ON "sessions" ("teacher_id", "date");

CREATE INDEX IF NOT EXISTS "sessions_teacher_id_teacher_payment_status_date_idx"
ON "sessions" ("teacher_id", "teacher_payment_status", "date");
