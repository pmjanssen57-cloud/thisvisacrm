CREATE TABLE IF NOT EXISTS website_articles (
 id uuid PRIMARY KEY,slug text NOT NULL UNIQUE,draft_json jsonb NOT NULL,
 revision bigint NOT NULL DEFAULT 1,delivery_sequence bigint NOT NULL DEFAULT 0,delivery_pending boolean NOT NULL DEFAULT false,
 published_json jsonb,published_revision bigint NOT NULL DEFAULT 0,
 published_draft_revision bigint NOT NULL DEFAULT 0,status text NOT NULL DEFAULT 'Draft',
 updated_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT NOW(),updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS website_revisions (
 article_id uuid NOT NULL REFERENCES website_articles(id),revision bigint NOT NULL,
 content_json jsonb NOT NULL,created_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT NOW(),PRIMARY KEY(article_id,revision)
);
CREATE TABLE IF NOT EXISTS website_deliveries (
 id uuid PRIMARY KEY,article_id uuid NOT NULL REFERENCES website_articles(id),action text NOT NULL,
 delivery_revision bigint NOT NULL,payload_json jsonb NOT NULL,state text NOT NULL DEFAULT 'Pending',
 attempt_id uuid,message text NOT NULL DEFAULT '',created_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT NOW(),updated_at timestamptz NOT NULL DEFAULT NOW(),UNIQUE(article_id,delivery_revision)
);
CREATE INDEX IF NOT EXISTS website_deliveries_article ON website_deliveries(article_id,created_at);
CREATE TABLE IF NOT EXISTS website_settings (id text PRIMARY KEY,connection_id text,updated_by text NOT NULL,updated_at timestamptz NOT NULL DEFAULT NOW());
