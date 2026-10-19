CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE commercial_clients
  ADD COLUMN IF NOT EXISTS gst_number TEXT,
  ADD COLUMN IF NOT EXISTS ird_number TEXT;

CREATE TABLE IF NOT EXISTS employer_accreditation_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_client_id UUID REFERENCES commercial_clients(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Submitted',
  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  legal_name TEXT NOT NULL,
  trading_name TEXT,
  nzbn TEXT,
  company_number TEXT,
  gst_number TEXT,
  ird_number TEXT,
  accreditation_application_type TEXT,
  accreditation_type TEXT,
  current_accreditation_expiry DATE,
  business_operation_length TEXT,
  viability_basis TEXT,
  key_people JSONB NOT NULL DEFAULT '[]'::jsonb,
  declarations JSONB NOT NULL DEFAULT '{}'::jsonb,
  uploaded_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  duplicate_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employer_accreditation_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Draft',
  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_email TEXT NOT NULL,
  legal_name TEXT,
  nzbn TEXT,
  current_step INTEGER NOT NULL DEFAULT 1,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  uploaded_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  resume_email_sent_at TIMESTAMPTZ,
  submitted_questionnaire_id UUID REFERENCES employer_accreditation_questionnaires(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employer_accreditation_questionnaires_client
  ON employer_accreditation_questionnaires(commercial_client_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_employer_accreditation_questionnaires_email
  ON employer_accreditation_questionnaires(LOWER(contact_email));
CREATE INDEX IF NOT EXISTS idx_employer_accreditation_questionnaires_nzbn
  ON employer_accreditation_questionnaires(nzbn) WHERE nzbn IS NOT NULL AND nzbn <> '';
CREATE INDEX IF NOT EXISTS idx_employer_accreditation_drafts_email
  ON employer_accreditation_drafts(LOWER(contact_email));
CREATE INDEX IF NOT EXISTS idx_employer_accreditation_drafts_expiry
  ON employer_accreditation_drafts(expires_at);
