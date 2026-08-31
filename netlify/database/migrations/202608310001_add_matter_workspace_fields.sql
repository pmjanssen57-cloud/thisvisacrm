-- THiS CRM v0.17.0: adviser matter workspace operating state and timeline.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS matter_status TEXT NOT NULL DEFAULT 'No current action',
  ADD COLUMN IF NOT EXISTS matter_review_date DATE,
  ADD COLUMN IF NOT EXISTS matter_activity JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE clients
SET matter_status = CASE
  WHEN client_status = 'Closed' THEN 'Completed'
  WHEN COALESCE(TRIM(next_action), '') <> '' THEN 'Adviser action required'
  ELSE 'No current action'
END
WHERE matter_status IS NULL OR matter_status = '' OR matter_status = 'No current action';

CREATE INDEX IF NOT EXISTS idx_clients_matter_status_review
  ON clients(matter_status, matter_review_date);
