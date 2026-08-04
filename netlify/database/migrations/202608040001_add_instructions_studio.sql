CREATE TABLE IF NOT EXISTS instruction_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  standalone_label TEXT,
  studio_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  template_version JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS instruction_sets_client_id_idx ON instruction_sets(client_id);
CREATE INDEX IF NOT EXISTS instruction_sets_updated_at_idx ON instruction_sets(updated_at DESC);

CREATE TABLE IF NOT EXISTS instruction_template_library (
  id TEXT PRIMARY KEY DEFAULT 'master',
  library_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instruction_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id TEXT NOT NULL,
  version_label TEXT NOT NULL,
  change_note TEXT,
  snapshot JSONB NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS instruction_template_versions_pack_idx ON instruction_template_versions(pack_id, created_at DESC);
