CREATE INDEX IF NOT EXISTS "action_history_entity_type_idx"
ON "action_history" ("entity_type");

CREATE INDEX IF NOT EXISTS "action_history_entity_id_idx"
ON "action_history" ("entity_id");

CREATE INDEX IF NOT EXISTS "action_history_action_type_idx"
ON "action_history" ("action_type");

CREATE INDEX IF NOT EXISTS "action_history_created_at_idx"
ON "action_history" ("created_at");
