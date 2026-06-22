ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS body_html TEXT;
