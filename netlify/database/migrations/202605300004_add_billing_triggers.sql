ALTER TABLE billing_milestones ADD COLUMN IF NOT EXISTS billing_trigger_type TEXT NOT NULL DEFAULT 'Date';
ALTER TABLE billing_milestones ADD COLUMN IF NOT EXISTS billing_stage_key TEXT;
UPDATE billing_milestones SET status = 'WIP' WHERE status IN ('Draft', 'Scheduled');
UPDATE billing_milestones SET status = 'Invoiced' WHERE status = 'Paid';
