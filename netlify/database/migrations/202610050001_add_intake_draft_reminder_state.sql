ALTER TABLE intake_drafts ADD COLUMN IF NOT EXISTS reminder_email_sent_at TIMESTAMPTZ;
ALTER TABLE intake_drafts ADD COLUMN IF NOT EXISTS reminder_email_sent_by TEXT;

CREATE INDEX IF NOT EXISTS idx_intake_drafts_reminder_sent
  ON intake_drafts(reminder_email_sent_at)
  WHERE reminder_email_sent_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_notifications_intake_draft_reminder_once
  ON email_notifications(related_record_id, template_key)
  WHERE related_record_type = 'intake_draft'
    AND template_key = 'assessment_incomplete_reminder'
    AND status IN ('Sending', 'Sent');
