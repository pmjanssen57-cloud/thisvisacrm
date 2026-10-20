-- Staff review is separate from the original public submission and its client link.
ALTER TABLE employer_accreditation_questionnaires
  ADD COLUMN IF NOT EXISTS review JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS review_revision INTEGER NOT NULL DEFAULT 0;
