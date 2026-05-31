ALTER TABLE calendar_entries
  ADD COLUMN IF NOT EXISTS appointment_type TEXT NOT NULL DEFAULT 'Client meeting';
