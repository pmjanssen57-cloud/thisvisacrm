ALTER TABLE advisers
  ADD COLUMN IF NOT EXISTS login_email TEXT;

CREATE INDEX IF NOT EXISTS idx_advisers_login_email
  ON advisers (LOWER(login_email));
