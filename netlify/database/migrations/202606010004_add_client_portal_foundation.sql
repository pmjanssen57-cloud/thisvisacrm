-- v0.10.0 - Client Portal Access Code Foundation
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_email TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_status_update TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_next_step TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_visible_document_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_visible_deadline_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_visible_appointment_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_access_code_hash TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_last_published_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_last_accessed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clients_portal_email ON clients (LOWER(portal_email));

CREATE TABLE IF NOT EXISTS client_portal_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  portal_email TEXT,
  action TEXT NOT NULL DEFAULT 'login',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
