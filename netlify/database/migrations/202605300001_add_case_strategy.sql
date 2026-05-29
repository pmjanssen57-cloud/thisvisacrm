-- Add the master case strategy field without altering the previously applied initial migration.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS case_strategy TEXT;
