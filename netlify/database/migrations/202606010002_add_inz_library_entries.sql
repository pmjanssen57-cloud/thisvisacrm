CREATE TABLE IF NOT EXISTS library_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type TEXT NOT NULL DEFAULT 'Policy',
  reference_code TEXT,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'Current',
  official_url TEXT,
  version_label TEXT,
  acceptable_until DATE,
  related_case_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_document_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  internal_summary TEXT,
  adviser_notes TEXT,
  last_reviewed DATE,
  next_review_due DATE,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_library_entries_type ON library_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_library_entries_status ON library_entries(status);
CREATE INDEX IF NOT EXISTS idx_library_entries_review_due ON library_entries(next_review_due);
