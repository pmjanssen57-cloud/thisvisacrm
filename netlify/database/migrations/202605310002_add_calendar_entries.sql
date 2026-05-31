CREATE TABLE IF NOT EXISTS calendar_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_entries_date ON calendar_entries(appointment_date);
CREATE INDEX IF NOT EXISTS idx_calendar_entries_client ON calendar_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_calendar_entries_adviser ON calendar_entries(adviser_id);
