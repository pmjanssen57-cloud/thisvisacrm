CREATE TABLE IF NOT EXISTS backup_jobs (
  id UUID PRIMARY KEY,
  requested_by TEXT,
  requested_by_email TEXT,
  status TEXT NOT NULL DEFAULT 'Queued',
  progress INTEGER NOT NULL DEFAULT 0,
  current_step TEXT,
  file_name TEXT,
  blob_key TEXT,
  size_bytes BIGINT,
  archive_sha256 TEXT,
  part_count INTEGER NOT NULL DEFAULT 0,
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  table_count INTEGER NOT NULL DEFAULT 0,
  record_count BIGINT NOT NULL DEFAULT 0,
  file_count INTEGER NOT NULL DEFAULT 0,
  failed_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS backup_jobs_created_at_idx ON backup_jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS backup_jobs_status_idx ON backup_jobs (status);
CREATE INDEX IF NOT EXISTS backup_jobs_expires_at_idx ON backup_jobs (expires_at);
