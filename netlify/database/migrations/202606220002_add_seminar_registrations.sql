CREATE TABLE IF NOT EXISTS seminars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  seminar_date DATE,
  seminar_time TEXT,
  timezone TEXT NOT NULL DEFAULT 'Pacific/Auckland',
  presenter_name TEXT,
  zoom_link TEXT,
  zoom_password TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  registration_open BOOLEAN NOT NULL DEFAULT TRUE,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seminars_status_date ON seminars(status, seminar_date DESC);

CREATE TABLE IF NOT EXISTS seminar_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seminar_id UUID NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'New',
  full_name TEXT,
  date_of_birth DATE,
  citizenship_country TEXT,
  residence_country TEXT,
  timezone TEXT,
  email TEXT,
  partnership_status TEXT,
  highest_qualification TEXT,
  current_occupation TEXT,
  work_history TEXT,
  health_character_issues TEXT,
  english_ability TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by TEXT,
  approved_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seminar_registrations_seminar ON seminar_registrations(seminar_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seminar_registrations_status ON seminar_registrations(status);
CREATE INDEX IF NOT EXISTS idx_seminar_registrations_email ON seminar_registrations(LOWER(email));
