-- Global single "current survey round" (lần khảo sát hiện tại) managed by admin.
-- Single-row table seeded with the current business round (6).

CREATE TABLE "survey_round" (
  "id" TEXT NOT NULL DEFAULT 'current',
  "current_round" INTEGER NOT NULL DEFAULT 6,
  "updated_by_user_id" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "survey_round_pkey" PRIMARY KEY ("id")
);

INSERT INTO "survey_round" ("id", "current_round")
VALUES ('current', 6)
ON CONFLICT ("id") DO NOTHING;
