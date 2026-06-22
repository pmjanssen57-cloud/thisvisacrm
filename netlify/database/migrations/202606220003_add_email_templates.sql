CREATE TABLE IF NOT EXISTS email_templates (
  template_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  placeholders JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(name);
