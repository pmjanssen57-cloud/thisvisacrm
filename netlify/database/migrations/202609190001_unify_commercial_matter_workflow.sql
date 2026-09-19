-- THiS CRM v0.17.29: bring commercial clients into the standard matter workflow.
-- Existing commercial tables and portal/compliance relationships are preserved.
ALTER TABLE commercial_clients
  ADD COLUMN IF NOT EXISTS matter_name TEXT,
  ADD COLUMN IF NOT EXISTS case_type TEXT NOT NULL DEFAULT 'Commercial / Employer',
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'Normal',
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS next_action_due DATE,
  ADD COLUMN IF NOT EXISTS matter_status TEXT NOT NULL DEFAULT 'No current action',
  ADD COLUMN IF NOT EXISTS matter_review_date DATE,
  ADD COLUMN IF NOT EXISTS matter_activity JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE commercial_clients
SET matter_status = CASE
  WHEN client_status = 'Closed' THEN 'Completed'
  WHEN COALESCE(TRIM(next_action), '') <> '' THEN 'Adviser action required'
  ELSE 'No current action'
END
WHERE matter_status IS NULL OR matter_status = '' OR matter_status = 'No current action';

UPDATE commercial_clients
SET case_type = 'Commercial / Employer'
WHERE case_type IS NULL OR TRIM(case_type) = '';

UPDATE commercial_clients
SET priority = 'Normal'
WHERE priority IS NULL OR TRIM(priority) = '';

CREATE INDEX IF NOT EXISTS idx_commercial_clients_matter_status_review
  ON commercial_clients(matter_status, matter_review_date);

CREATE INDEX IF NOT EXISTS idx_commercial_clients_next_action_due
  ON commercial_clients(next_action_due);
