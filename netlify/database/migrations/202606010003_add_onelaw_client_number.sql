ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS one_law_client_number TEXT;

CREATE INDEX IF NOT EXISTS idx_clients_one_law_client_number
  ON clients(one_law_client_number);
