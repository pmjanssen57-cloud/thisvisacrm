CREATE TABLE IF NOT EXISTS intake_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'New',
  assigned_adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
  applicant_first_name TEXT,
  applicant_last_name TEXT,
  email TEXT,
  phone TEXT,
  current_location TEXT,
  citizenship TEXT,
  date_of_birth DATE,
  current_visa_type TEXT,
  current_visa_expiry DATE,
  target_pathway TEXT,
  urgency TEXT,
  flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  adviser_assessment_notes TEXT,
  recommended_pathway TEXT,
  consultation_outcome TEXT,
  converted_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intake_enquiries_status ON intake_enquiries(status);
CREATE INDEX IF NOT EXISTS idx_intake_enquiries_created_at ON intake_enquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intake_enquiries_assigned_adviser ON intake_enquiries(assigned_adviser_id);
CREATE INDEX IF NOT EXISTS idx_intake_enquiries_email ON intake_enquiries(LOWER(email));
