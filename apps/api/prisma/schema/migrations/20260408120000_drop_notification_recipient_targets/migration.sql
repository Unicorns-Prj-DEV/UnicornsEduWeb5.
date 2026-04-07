-- Rollback recipient targeting columns (FE-only mock UI now).
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "target_all";
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "target_user_ids";
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "target_role_types";
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "target_staff_roles";
