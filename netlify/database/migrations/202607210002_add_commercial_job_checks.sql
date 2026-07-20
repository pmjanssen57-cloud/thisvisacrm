CREATE TABLE IF NOT EXISTS commercial_job_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_client_id UUID NOT NULL REFERENCES commercial_clients(id) ON DELETE CASCADE,
  reference_number TEXT NOT NULL,
  role_title TEXT NOT NULL,
  skill_level TEXT,
  work_location TEXT,
  pay_rate_min NUMERIC(12,2),
  pay_rate_max NUMERIC(12,2),
  pay_frequency TEXT NOT NULL DEFAULT 'Hourly',
  positions_approved INTEGER NOT NULL DEFAULT 1,
  positions_used INTEGER NOT NULL DEFAULT 0,
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  employer_notes TEXT,
  internal_notes TEXT,
  adviser_review_status TEXT NOT NULL DEFAULT 'Needs review',
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commercial_job_checks_company
  ON commercial_job_checks(commercial_client_id, status, expiry_date);

CREATE INDEX IF NOT EXISTS idx_commercial_job_checks_reference
  ON commercial_job_checks(commercial_client_id, reference_number);
