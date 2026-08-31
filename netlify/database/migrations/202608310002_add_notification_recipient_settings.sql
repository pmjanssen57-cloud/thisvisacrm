CREATE TABLE IF NOT EXISTS notification_recipient_settings (
  notification_key TEXT PRIMARY KEY,
  adviser_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_emails TEXT NOT NULL DEFAULT '',
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
