-- THiS CRM v0.15.14: keep high-frequency chat/dashboard lookups index-backed.

CREATE INDEX IF NOT EXISTS idx_live_chat_conversations_open_queue
  ON live_chat_conversations(status, assigned_adviser_id, last_message_at DESC)
  WHERE status IN ('Waiting', 'Offline', 'Active');

CREATE INDEX IF NOT EXISTS idx_live_chat_conversations_closed_recent
  ON live_chat_conversations(closed_at DESC)
  WHERE status = 'Closed';

CREATE INDEX IF NOT EXISTS idx_live_chat_messages_public_latest
  ON live_chat_messages(conversation_id, created_at DESC)
  WHERE is_internal = FALSE;

CREATE INDEX IF NOT EXISTS idx_live_chat_messages_sender_rate
  ON live_chat_messages(conversation_id, sender_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_stages_client_sort
  ON client_stages(client_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_client_deadlines_client_date
  ON client_deadlines(client_id, deadline_date);

CREATE INDEX IF NOT EXISTS idx_billing_milestones_client_due
  ON billing_milestones(client_id, due_date);

CREATE INDEX IF NOT EXISTS idx_personal_tasks_adviser_due_status
  ON personal_tasks(adviser_id, due_date, status);

CREATE INDEX IF NOT EXISTS idx_calendar_entries_adviser_date_status
  ON calendar_entries(adviser_id, appointment_date, status);
