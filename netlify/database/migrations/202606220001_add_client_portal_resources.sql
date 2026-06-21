ALTER TABLE clients
ADD COLUMN IF NOT EXISTS portal_resource_settings JSONB NOT NULL DEFAULT '{}'::jsonb;
