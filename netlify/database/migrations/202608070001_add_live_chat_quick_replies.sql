ALTER TABLE live_chat_settings
  ADD COLUMN IF NOT EXISTS quick_replies JSONB NOT NULL DEFAULT '[]'::jsonb;
