ALTER TABLE client_portal_documents
  ADD COLUMN IF NOT EXISTS visible_to_client BOOLEAN DEFAULT TRUE;

ALTER TABLE client_portal_documents
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE client_portal_documents
SET visible_to_client = TRUE
WHERE visible_to_client IS NULL;

CREATE INDEX IF NOT EXISTS idx_client_portal_documents_client
  ON client_portal_documents(client_id, uploaded_at DESC);
