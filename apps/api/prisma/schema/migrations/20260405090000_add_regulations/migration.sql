CREATE TYPE "RegulationAudience" AS ENUM (
  'all',
  'student',
  'staff_admin',
  'staff_teacher',
  'staff_assistant',
  'staff_lesson_plan',
  'staff_lesson_plan_head',
  'staff_accountant',
  'staff_communication',
  'staff_customer_care'
);

CREATE TABLE "regulations" (
  "id" TEXT NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "content" TEXT NOT NULL,
  "audiences" "RegulationAudience"[] NOT NULL DEFAULT ARRAY[]::"RegulationAudience"[],
  "resource_link" TEXT,
  "resource_link_label" VARCHAR(160),
  "created_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "regulations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "regulations_updated_at_idx" ON "regulations"("updated_at");
CREATE INDEX "regulations_created_by_user_id_idx" ON "regulations"("created_by_user_id");
CREATE INDEX "regulations_updated_by_user_id_idx" ON "regulations"("updated_by_user_id");

ALTER TABLE "regulations"
ADD CONSTRAINT "regulations_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "regulations"
ADD CONSTRAINT "regulations_updated_by_user_id_fkey"
FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
