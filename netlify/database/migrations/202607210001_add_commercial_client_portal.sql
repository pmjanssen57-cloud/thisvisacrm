CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS commercial_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name TEXT NOT NULL,
  trading_name TEXT,
  nzbn TEXT,
  company_number TEXT,
  industry TEXT,
  business_description TEXT,
  address TEXT,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  primary_adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
  backup_adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
  client_status TEXT NOT NULL DEFAULT 'Active',
  sharepoint_folder_url TEXT,
  one_law_client_number TEXT,
  accreditation_type TEXT,
  accreditation_status TEXT NOT NULL DEFAULT 'Not recorded',
  accreditation_approval_date DATE,
  accreditation_expiry_date DATE,
  accreditation_renewal_date DATE,
  accreditation_notes TEXT,
  compliance_summary TEXT,
  internal_notes TEXT,
  portal_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  portal_last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commercial_portal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_client_id UUID NOT NULL REFERENCES commercial_clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Company User',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  access_code_hash TEXT,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (commercial_client_id, email)
);

CREATE TABLE IF NOT EXISTS commercial_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_client_id UUID NOT NULL REFERENCES commercial_clients(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  job_title TEXT,
  work_location TEXT,
  visa_type TEXT,
  visa_start_date DATE,
  visa_expiry_date DATE,
  passport_expiry_date DATE,
  employment_start_date DATE,
  employment_end_date DATE,
  hours_per_week NUMERIC(6,2),
  pay_rate NUMERIC(12,2),
  job_check_reference TEXT,
  visa_conditions TEXT,
  responsible_manager TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  adviser_review_status TEXT NOT NULL DEFAULT 'Needs review',
  employer_notes TEXT,
  internal_notes TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commercial_compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_client_id UUID NOT NULL REFERENCES commercial_clients(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES commercial_workers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General compliance',
  status TEXT NOT NULL DEFAULT 'Open',
  due_date DATE,
  completed_date DATE,
  employer_notes TEXT,
  internal_notes TEXT,
  adviser_review_status TEXT NOT NULL DEFAULT 'Needs review',
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commercial_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_client_id UUID NOT NULL REFERENCES commercial_clients(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES commercial_workers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Compliance',
  document_url TEXT,
  expiry_date DATE,
  notes TEXT,
  visible_to_employer BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commercial_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_client_id UUID NOT NULL REFERENCES commercial_clients(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL,
  changed_by TEXT,
  changed_by_type TEXT NOT NULL DEFAULT 'CRM adviser',
  summary TEXT,
  changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commercial_clients_adviser ON commercial_clients(primary_adviser_id);
CREATE INDEX IF NOT EXISTS idx_commercial_clients_accreditation_expiry ON commercial_clients(accreditation_expiry_date);
CREATE INDEX IF NOT EXISTS idx_commercial_portal_users_email ON commercial_portal_users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_commercial_workers_company ON commercial_workers(commercial_client_id, status);
CREATE INDEX IF NOT EXISTS idx_commercial_workers_visa_expiry ON commercial_workers(visa_expiry_date);
CREATE INDEX IF NOT EXISTS idx_commercial_compliance_company ON commercial_compliance_items(commercial_client_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_commercial_documents_company ON commercial_documents(commercial_client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commercial_audit_company ON commercial_audit_log(commercial_client_id, created_at DESC);
