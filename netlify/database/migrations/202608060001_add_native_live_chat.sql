CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS live_chat_settings (
  id TEXT PRIMARY KEY DEFAULT 'master',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  timezone TEXT NOT NULL DEFAULT 'Pacific/Auckland',
  weekly_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  away_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  welcome_message TEXT,
  offline_message TEXT,
  privacy_url TEXT,
  notification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notification_emails TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'Waiting',
  visitor_name TEXT NOT NULL,
  visitor_email TEXT NOT NULL,
  visitor_phone TEXT,
  existing_client BOOLEAN NOT NULL DEFAULT FALSE,
  category TEXT,
  page_url TEXT,
  visitor_fingerprint TEXT,
  assigned_adviser_id UUID,
  assigned_adviser_name TEXT,
  assigned_adviser_email TEXT,
  linked_intake_id UUID,
  first_notification_sent_at TIMESTAMPTZ,
  first_notification_status TEXT,
  first_notification_error TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visitor_last_seen_at TIMESTAMPTZ,
  adviser_last_seen_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES live_chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  sender_name TEXT,
  message_text TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_chat_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES live_chat_conversations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_name TEXT,
  event_detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_chat_conversations_status ON live_chat_conversations(status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_chat_conversations_assigned ON live_chat_conversations(assigned_adviser_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_chat_conversations_fingerprint ON live_chat_conversations(visitor_fingerprint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_conversation ON live_chat_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_live_chat_events_conversation ON live_chat_events(conversation_id, created_at);
