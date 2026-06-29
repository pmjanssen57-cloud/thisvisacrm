CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'New',
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  adviser_name TEXT,
  application_type TEXT,
  overall_rating TEXT,
  recommendation_rating TEXT,
  service_strengths TEXT,
  improvement_suggestions TEXT,
  permission_to_contact TEXT,
  permission_to_use_feedback TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_submissions_status ON feedback_submissions(status);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created_at ON feedback_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_email ON feedback_submissions(LOWER(email));
