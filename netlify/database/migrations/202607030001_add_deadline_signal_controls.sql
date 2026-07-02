ALTER TABLE client_deadlines ADD COLUMN IF NOT EXISTS action_status TEXT;
ALTER TABLE client_deadlines ADD COLUMN IF NOT EXISTS review_date DATE;

UPDATE client_deadlines
SET action_status = CASE
  WHEN LOWER(deadline_type) LIKE '%ppi%' OR LOWER(deadline_type) LIKE '%filing%' THEN 'active'
  ELSE 'watching'
END
WHERE action_status IS NULL OR action_status = '';

ALTER TABLE client_deadlines ALTER COLUMN action_status SET DEFAULT 'watching';
ALTER TABLE client_deadlines ALTER COLUMN action_status SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_deadlines_action_status ON client_deadlines(action_status);
CREATE INDEX IF NOT EXISTS idx_client_deadlines_review_date ON client_deadlines(review_date);
