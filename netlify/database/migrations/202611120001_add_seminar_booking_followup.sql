-- Additive: post-seminar invitations are separate from pre-event reminders.
ALTER TABLE seminars ADD COLUMN IF NOT EXISTS presenter_email TEXT NOT NULL DEFAULT '';
ALTER TABLE seminars ADD COLUMN IF NOT EXISTS presenter_booking_url TEXT NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS seminar_followup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seminar_id UUID NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
  request_key UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Queued',
  event_hash TEXT NOT NULL,
  settings JSONB NOT NULL,
  subject TEXT NOT NULL,
  extra_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seminar_followup_jobs_status ON seminar_followup_jobs(status,created_at);
CREATE INDEX IF NOT EXISTS idx_seminar_followup_jobs_seminar ON seminar_followup_jobs(seminar_id,created_at DESC);
CREATE TABLE IF NOT EXISTS seminar_followup_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES seminar_followup_jobs(id) ON DELETE CASCADE,
  seminar_id UUID NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES seminar_registrations(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  email_log_id UUID,
  claimed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT NOT NULL DEFAULT '',
  UNIQUE(job_id,email)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_seminar_followup_reserved_email ON seminar_followup_deliveries(seminar_id,email) WHERE status IN ('Pending','Sending','Sent','Failed','Unknown');
