ALTER TABLE commercial_clients
  ADD COLUMN IF NOT EXISTS reminder_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE commercial_workers
  ADD COLUMN IF NOT EXISTS job_check_id UUID REFERENCES commercial_job_checks(id) ON DELETE SET NULL;

ALTER TABLE commercial_documents
  ADD COLUMN IF NOT EXISTS blob_key TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS uploaded_by_type TEXT;

CREATE TABLE IF NOT EXISTS commercial_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_client_id UUID NOT NULL REFERENCES commercial_clients(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  record_id UUID,
  threshold_days INTEGER NOT NULL,
  expiry_date DATE NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  provider_request_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (commercial_client_id, record_type, record_id, threshold_days, expiry_date, recipient_email)
);

UPDATE commercial_workers w
SET job_check_id = j.id
FROM commercial_job_checks j
WHERE w.job_check_id IS NULL
  AND w.commercial_client_id = j.commercial_client_id
  AND LOWER(BTRIM(COALESCE(w.job_check_reference, ''))) = LOWER(BTRIM(j.reference_number))
  AND BTRIM(COALESCE(w.job_check_reference, '')) <> '';

CREATE INDEX IF NOT EXISTS idx_commercial_workers_job_check
  ON commercial_workers(commercial_client_id, job_check_id, status);

CREATE INDEX IF NOT EXISTS idx_commercial_documents_blob_key
  ON commercial_documents(blob_key)
  WHERE blob_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commercial_reminder_due
  ON commercial_reminder_log(commercial_client_id, expiry_date, threshold_days, status);
