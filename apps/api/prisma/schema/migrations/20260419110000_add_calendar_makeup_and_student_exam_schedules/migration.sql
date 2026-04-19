-- Add authoritative storage for one-off makeup schedule events and student exam schedules.

CREATE TABLE "makeup_schedule_events" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "class_id" TEXT NOT NULL,
  "teacher_id" TEXT NOT NULL,
  "linked_session_id" TEXT,
  "date" DATE NOT NULL,
  "start_time" TIME(6),
  "end_time" TIME(6),
  "title" TEXT,
  "note" TEXT,
  "google_meet_link" TEXT,
  "google_calendar_event_id" TEXT,
  "calendar_synced_at" TIMESTAMPTZ(6),
  "calendar_sync_error" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "makeup_schedule_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "makeup_schedule_events_linked_session_id_key" UNIQUE ("linked_session_id"),
  CONSTRAINT "makeup_schedule_events_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "makeup_schedule_events_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "staff_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "makeup_schedule_events_linked_session_id_fkey" FOREIGN KEY ("linked_session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "student_exam_schedules" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "student_id" TEXT NOT NULL,
  "exam_date" DATE NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "student_exam_schedules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_exam_schedules_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_info"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "makeup_schedule_events_class_id_idx" ON "makeup_schedule_events" ("class_id");
CREATE INDEX "makeup_schedule_events_teacher_id_idx" ON "makeup_schedule_events" ("teacher_id");
CREATE INDEX "makeup_schedule_events_date_idx" ON "makeup_schedule_events" ("date");
CREATE INDEX "makeup_schedule_events_class_id_date_idx" ON "makeup_schedule_events" ("class_id", "date");
CREATE INDEX "makeup_schedule_events_teacher_id_date_idx" ON "makeup_schedule_events" ("teacher_id", "date");
CREATE INDEX "makeup_schedule_events_google_calendar_event_id_idx" ON "makeup_schedule_events" ("google_calendar_event_id");

CREATE INDEX "student_exam_schedules_student_id_idx" ON "student_exam_schedules" ("student_id");
CREATE INDEX "student_exam_schedules_exam_date_idx" ON "student_exam_schedules" ("exam_date");
