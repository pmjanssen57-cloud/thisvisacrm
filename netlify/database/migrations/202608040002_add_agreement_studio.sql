CREATE TABLE IF NOT EXISTS agreement_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  app_type TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'Draft',
  standalone_label TEXT,
  recipient_email TEXT,
  studio_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  template_version JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  updated_by TEXT,
  issued_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  accepted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agreement_sets_client_id_idx ON agreement_sets(client_id);
CREATE INDEX IF NOT EXISTS agreement_sets_updated_at_idx ON agreement_sets(updated_at DESC);

CREATE TABLE IF NOT EXISTS agreement_template_library (
  id TEXT PRIMARY KEY DEFAULT 'master',
  library_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agreement_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_label TEXT NOT NULL,
  change_note TEXT,
  snapshot JSONB NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agreement_signatories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES agreement_sets(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT NOT NULL,
  role TEXT,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  token_hash TEXT NOT NULL UNIQUE,
  token_last_four TEXT,
  status TEXT NOT NULL DEFAULT 'Sent',
  expires_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  typed_name TEXT,
  signature_data TEXT,
  declarations JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agreement_signatories_agreement_idx ON agreement_signatories(agreement_id, created_at);
CREATE INDEX IF NOT EXISTS agreement_signatories_token_hash_idx ON agreement_signatories(token_hash);
