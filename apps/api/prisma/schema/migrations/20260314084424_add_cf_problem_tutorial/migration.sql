-- CreateTable
CREATE TABLE "cf_problem_tutorials" (
    "id" TEXT NOT NULL,
    "contest_id" INTEGER NOT NULL,
    "problem_index" TEXT NOT NULL,
    "tutorial" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cf_problem_tutorials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cf_problem_tutorials_contest_id_idx" ON "cf_problem_tutorials"("contest_id");

-- CreateIndex
CREATE UNIQUE INDEX "cf_problem_tutorials_contest_id_problem_index_key" ON "cf_problem_tutorials"("contest_id", "problem_index");
