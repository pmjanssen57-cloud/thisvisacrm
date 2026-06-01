-- v0.10.1 - Client Portal Section and Billing Visibility
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_visible_billing_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
