ALTER TABLE clients ADD COLUMN IF NOT EXISTS document_checklist JSONB NOT NULL DEFAULT '[]'::jsonb;
