CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS advisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  licence TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  nationality TEXT,
  location TEXT,
  matter_name TEXT,
  case_type TEXT NOT NULL,
  primary_adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
  backup_adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'Normal',
  client_status TEXT NOT NULL DEFAULT 'Active',
  next_action TEXT,
  next_action_due DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  stage_label TEXT NOT NULL,
  mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  applied BOOLEAN NOT NULL DEFAULT TRUE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_date DATE,
  sort_order INTEGER NOT NULL,
  UNIQUE (client_id, stage_key)
);

CREATE TABLE IF NOT EXISTS client_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  deadline_type TEXT NOT NULL,
  deadline_date DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  milestone TEXT NOT NULL,
  due_date DATE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Draft',
  invoice_no TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_case_type ON clients(case_type);
CREATE INDEX IF NOT EXISTS idx_clients_primary_adviser ON clients(primary_adviser_id);
CREATE INDEX IF NOT EXISTS idx_client_deadlines_date ON client_deadlines(deadline_date);
CREATE INDEX IF NOT EXISTS idx_billing_milestones_due_date ON billing_milestones(due_date);
