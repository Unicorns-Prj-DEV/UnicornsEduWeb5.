ALTER TABLE "makeup_schedule_events"
ADD COLUMN "baseline_schedule_entry_id" TEXT,
ADD COLUMN "original_date" DATE;

CREATE INDEX "makeup_schedule_events_baseline_schedule_entry_id_idx"
ON "makeup_schedule_events" ("baseline_schedule_entry_id");

CREATE INDEX "makeup_schedule_events_class_id_baseline_schedule_entry_id_original_date_idx"
ON "makeup_schedule_events" ("class_id", "baseline_schedule_entry_id", "original_date");
