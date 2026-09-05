-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "default_duration_days" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_difficulty_levels" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "course_difficulty_levels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_difficulty_levels_course_id_name_key" ON "course_difficulty_levels"("course_id", "name");

-- CreateIndex
CREATE INDEX "course_difficulty_levels_course_id_idx" ON "course_difficulty_levels"("course_id");

-- Backfill courses from class_categories (same id, same data)
INSERT INTO "courses" ("id", "name", "sort_order", "is_active", "created_at", "updated_at")
SELECT "id", "name", "sort_order", "is_active", "created_at", "updated_at"
FROM "class_categories";

-- AddColumn course_id to classes
ALTER TABLE "classes" ADD COLUMN "course_id" TEXT;

-- Backfill course_id from class_category_id
UPDATE "classes" SET "course_id" = "class_category_id";

-- Set NOT NULL after backfill
ALTER TABLE "classes" ALTER COLUMN "course_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_difficulty_levels" ADD CONSTRAINT "course_difficulty_levels_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "classes_course_id_idx" ON "classes"("course_id");

-- Seed default difficulty levels for each course (3 levels: Dễ, Trung bình, Khó)
INSERT INTO "course_difficulty_levels" ("id", "course_id", "name", "sort_order", "is_active")
SELECT
    gen_random_uuid()::text,
    c.id,
    levels.name,
    levels.sort_order,
    true
FROM "courses" c
CROSS JOIN (VALUES ('Dễ', 0), ('Trung bình', 1), ('Khó', 2)) AS levels(name, sort_order);
