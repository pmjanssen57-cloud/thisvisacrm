ALTER TABLE advisers ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'Available';
UPDATE advisers SET availability_status = 'Available' WHERE availability_status IS NULL OR availability_status = '';
