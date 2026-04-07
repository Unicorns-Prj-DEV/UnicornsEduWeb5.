-- Reintroduce notification audience targeting for admin/staff/student feeds.

ALTER TABLE "notifications"
ADD COLUMN "target_all" BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN "target_role_types" "UserRole"[] NOT NULL DEFAULT ARRAY[]::"UserRole"[],
ADD COLUMN "target_staff_roles" "StaffRole"[] NOT NULL DEFAULT ARRAY[]::"StaffRole"[],
ADD COLUMN "target_user_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "notifications_target_all_idx" ON "notifications"("target_all");

CREATE INDEX "notifications_target_role_types_gin_idx"
ON "notifications" USING GIN ("target_role_types");

CREATE INDEX "notifications_target_staff_roles_gin_idx"
ON "notifications" USING GIN ("target_staff_roles");

CREATE INDEX "notifications_target_user_ids_gin_idx"
ON "notifications" USING GIN ("target_user_ids");
