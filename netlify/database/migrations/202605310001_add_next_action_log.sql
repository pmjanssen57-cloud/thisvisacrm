-- Store a durable history of completed/replaced next actions for each client.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS next_action_log JSONB NOT NULL DEFAULT '[]'::jsonb;
