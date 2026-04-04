-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 0,
    "push_count" INTEGER NOT NULL DEFAULT 0,
    "last_pushed_at" TIMESTAMPTZ(6),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_last_pushed_at_idx" ON "notifications"("last_pushed_at");

-- CreateIndex
CREATE INDEX "notifications_updated_at_idx" ON "notifications"("updated_at");

-- CreateIndex
CREATE INDEX "notifications_created_by_user_id_idx" ON "notifications"("created_by_user_id");

-- AddForeignKey
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
