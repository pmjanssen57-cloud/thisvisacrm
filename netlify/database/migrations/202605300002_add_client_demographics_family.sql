-- Add client demographic and family fields without altering earlier applied migrations.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS family_members JSONB NOT NULL DEFAULT '[]'::jsonb;
