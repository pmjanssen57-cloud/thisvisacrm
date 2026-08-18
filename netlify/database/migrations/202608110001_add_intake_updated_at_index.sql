-- THiS CRM v0.15.12
-- Supports low-cost incremental intake/contact refreshes.
CREATE INDEX IF NOT EXISTS idx_intake_enquiries_updated_at
  ON intake_enquiries(updated_at ASC);
