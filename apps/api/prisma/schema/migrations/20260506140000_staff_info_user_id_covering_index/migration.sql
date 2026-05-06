-- Covering unique index for staff_info lookups by user_id (auth/session, getStaffRoles).
-- Replaces plain unique btree so common projections (id, user_id, roles) can use index-only scans.
DROP INDEX IF EXISTS "staff_info_user_id_key";

CREATE UNIQUE INDEX "staff_info_user_id_key" ON "staff_info" ("user_id") INCLUDE ("id", "roles");
