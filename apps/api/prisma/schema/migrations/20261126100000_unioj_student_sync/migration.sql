-- Đồng bộ học sinh UNIOJ (instance IT): username UNIOJ trên hồ sơ + outbox lệnh gỡ/bật role.
ALTER TABLE "student_info" ADD COLUMN "unioj_username" VARCHAR(50);

CREATE TYPE "UniojStudentSyncAction" AS ENUM ('deactivate', 'activate');
CREATE TYPE "UniojStudentSyncStatus" AS ENUM ('pending', 'done', 'failed');

CREATE TABLE "unioj_student_sync_events" (
    "id" VARCHAR(26) NOT NULL,
    "external_id" VARCHAR(32) NOT NULL,
    "action" "UniojStudentSyncAction" NOT NULL,
    "reason" VARCHAR(32) NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "UniojStudentSyncStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" VARCHAR(500),
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "unioj_student_sync_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "unioj_student_sync_events_status_next_attempt_at_idx" ON "unioj_student_sync_events"("status", "next_attempt_at");
CREATE INDEX "unioj_student_sync_events_external_id_idx" ON "unioj_student_sync_events"("external_id");
