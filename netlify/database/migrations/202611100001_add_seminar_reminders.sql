-- Additive only. Archiving uses the existing registration status/raw_payload.
CREATE TABLE IF NOT EXISTS seminar_reminder_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seminar_id UUID NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
  request_key UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  due_at TIMESTAMPTZ NOT NULL,
  event_at TIMESTAMPTZ NOT NULL,
  event_hash TEXT NOT NULL,
  subject TEXT NOT NULL,
  extra_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  seeded_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  error_message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seminar_reminder_jobs_due ON seminar_reminder_jobs(status, due_at);
CREATE INDEX IF NOT EXISTS idx_seminar_reminder_jobs_seminar ON seminar_reminder_jobs(seminar_id, created_at DESC);
CREATE TABLE IF NOT EXISTS seminar_reminder_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES seminar_reminder_jobs(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES seminar_registrations(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  email_log_id UUID,
  claimed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT NOT NULL DEFAULT '',
  provider_request_id TEXT NOT NULL DEFAULT '',
  UNIQUE(job_id, email)
);
