CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  related_record_type TEXT NOT NULL DEFAULT 'test',
  related_record_id UUID,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  intake_id UUID REFERENCES intake_enquiries(id) ON DELETE SET NULL,
  template_key TEXT NOT NULL DEFAULT 'test',
  from_email TEXT,
  from_name TEXT,
  to_email TEXT NOT NULL,
  cc TEXT,
  bcc TEXT,
  subject TEXT NOT NULL,
  body_text TEXT,
  body_html TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  sent_by TEXT,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_message TEXT,
  provider TEXT NOT NULL DEFAULT 'microsoft_graph',
  provider_request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at ON email_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
