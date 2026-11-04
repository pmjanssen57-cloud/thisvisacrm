-- Daily team overdue email: one durable delivery claim per NZ date and recipient.
-- Additive only: no existing client, adviser or email data is changed.
CREATE TABLE IF NOT EXISTS daily_overdue_digest_log (
  report_date DATE NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Sending','Sent','Failed','Unknown')),
  overdue_count INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 1,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  provider_request_id TEXT,
  error_message TEXT,
  PRIMARY KEY (report_date, recipient_email)
);
