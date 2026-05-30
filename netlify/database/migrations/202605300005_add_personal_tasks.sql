CREATE TABLE IF NOT EXISTS personal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'Open',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personal_tasks_due_date ON personal_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_personal_tasks_adviser ON personal_tasks(adviser_id);
