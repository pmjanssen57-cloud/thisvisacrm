-- Internal staff chat is isolated from all public website chat tables/routes.
CREATE TABLE IF NOT EXISTS team_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('general','direct','group')),
  title TEXT NOT NULL DEFAULT '',
  direct_key TEXT UNIQUE,
  created_by UUID REFERENCES advisers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS team_chat_members (
  conversation_id UUID NOT NULL REFERENCES team_chat_conversations(id) ON DELETE CASCADE,
  adviser_id UUID NOT NULL REFERENCES advisers(id) ON DELETE CASCADE,
  last_read_seq BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY(conversation_id, adviser_id)
);
CREATE TABLE IF NOT EXISTS team_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES team_chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  body TEXT NOT NULL,
  seq BIGSERIAL UNIQUE,
  request_key UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_team_chat_messages_conversation ON team_chat_messages(conversation_id,seq DESC);
CREATE INDEX IF NOT EXISTS idx_team_chat_members_adviser ON team_chat_members(adviser_id,conversation_id);
CREATE TABLE IF NOT EXISTS team_chat_file_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES team_chat_conversations(id) ON DELETE RESTRICT,
  target_kind TEXT NOT NULL CHECK(target_kind IN ('individual','commercial')),
  target_id UUID NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  snapshot JSONB NOT NULL,
  note_key TEXT NOT NULL UNIQUE,
  saved_by_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
  saved_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_team_chat_file_notes_target ON team_chat_file_notes(target_kind,target_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_chat_file_notes_conversation ON team_chat_file_notes(conversation_id,created_at DESC);
