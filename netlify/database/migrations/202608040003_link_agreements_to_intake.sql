ALTER TABLE agreement_sets
  ADD COLUMN IF NOT EXISTS intake_id UUID REFERENCES intake_enquiries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS agreement_sets_intake_id_idx ON agreement_sets(intake_id);
