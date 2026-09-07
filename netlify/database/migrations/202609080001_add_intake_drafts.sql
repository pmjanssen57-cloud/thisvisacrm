CREATE TABLE IF NOT EXISTS intake_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Draft',
  applicant_first_name TEXT,
  applicant_last_name TEXT,
  email TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 2,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  uploaded_files JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  resume_email_sent_at TIMESTAMPTZ,
  submitted_intake_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intake_drafts_status_updated ON intake_drafts(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_intake_drafts_email ON intake_drafts(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_intake_drafts_expires_at ON intake_drafts(expires_at);
