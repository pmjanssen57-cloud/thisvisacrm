CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS consultation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  price_nzd NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  buffer_minutes INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adviser_booking_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adviser_id UUID REFERENCES advisers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL DEFAULT 1,
  start_time TEXT NOT NULL DEFAULT '09:00',
  end_time TEXT NOT NULL DEFAULT '17:00',
  consultation_type_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adviser_booking_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adviser_id UUID REFERENCES advisers(id) ON DELETE CASCADE,
  block_date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consultation_booking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  intake_id UUID REFERENCES intake_enquiries(id) ON DELETE SET NULL,
  adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
  applicant_name TEXT,
  applicant_email TEXT,
  applicant_phone TEXT,
  allowed_type_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consultation_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id UUID REFERENCES consultation_booking_links(id) ON DELETE SET NULL,
  intake_id UUID REFERENCES intake_enquiries(id) ON DELETE SET NULL,
  adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
  consultation_type_id UUID REFERENCES consultation_types(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  applicant_name TEXT,
  applicant_email TEXT,
  applicant_phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Confirmed',
  payment_status TEXT NOT NULL DEFAULT 'Not required',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_availability_adviser_day ON adviser_booking_availability(adviser_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_booking_blocks_adviser_date ON adviser_booking_blocks(adviser_id, block_date);
CREATE INDEX IF NOT EXISTS idx_booking_links_token ON consultation_booking_links(token);
CREATE INDEX IF NOT EXISTS idx_consultation_bookings_adviser_date ON consultation_bookings(adviser_id, booking_date);

INSERT INTO consultation_types (name, duration_minutes, price_nzd, paid, description, active, sort_order, buffer_minutes)
SELECT 'Free 15-minute consultation', 15, 0, FALSE, 'A brief preliminary call to discuss the enquiry and next steps.', TRUE, 1, 15
WHERE NOT EXISTS (SELECT 1 FROM consultation_types WHERE name = 'Free 15-minute consultation');

INSERT INTO consultation_types (name, duration_minutes, price_nzd, paid, description, active, sort_order, buffer_minutes)
SELECT 'Paid 60-minute consultation', 60, 400, TRUE, 'A detailed immigration consultation. Payment is handled manually at this stage.', TRUE, 2, 15
WHERE NOT EXISTS (SELECT 1 FROM consultation_types WHERE name = 'Paid 60-minute consultation');
