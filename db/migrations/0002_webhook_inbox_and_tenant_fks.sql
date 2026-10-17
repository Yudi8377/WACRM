BEGIN;

-- Composite tenant keys prevent a record in one tenant from referencing another tenant's rows.
ALTER TABLE channel_connections ADD CONSTRAINT channel_connections_tenant_id_unique UNIQUE (tenant_id, id);
ALTER TABLE contacts ADD CONSTRAINT contacts_tenant_id_unique UNIQUE (tenant_id, id);
ALTER TABLE conversations ADD CONSTRAINT conversations_tenant_id_unique UNIQUE (tenant_id, id);

ALTER TABLE contact_channel_identities
  ADD CONSTRAINT contact_channel_identity_same_tenant_fk
  FOREIGN KEY (tenant_id, contact_id) REFERENCES contacts (tenant_id, id) ON DELETE CASCADE;
ALTER TABLE conversations
  ADD CONSTRAINT conversations_connection_same_tenant_fk
  FOREIGN KEY (tenant_id, connection_id) REFERENCES channel_connections (tenant_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT conversations_contact_same_tenant_fk
  FOREIGN KEY (tenant_id, contact_id) REFERENCES contacts (tenant_id, id) ON DELETE CASCADE;
ALTER TABLE messages
  ADD CONSTRAINT messages_conversation_same_tenant_fk
  FOREIGN KEY (tenant_id, conversation_id) REFERENCES conversations (tenant_id, id) ON DELETE CASCADE;

-- Trusted webhook ingress: only server-side webhook handlers/workers may access this table.
-- It stores verified provider payloads before a tenant/account mapping is resolved.
CREATE TABLE IF NOT EXISTS webhook_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('meta','tiktok','google')),
  event_key text NOT NULL,
  provider_account_id text,
  payload jsonb NOT NULL,
  signature_verified boolean NOT NULL DEFAULT false,
  processing_status text NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received','processing','processed','retry','dead_letter','ignored')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  last_error_code text,
  UNIQUE (provider, event_key)
);
CREATE INDEX IF NOT EXISTS webhook_inbox_status_idx ON webhook_inbox (processing_status, received_at);
CREATE INDEX IF NOT EXISTS webhook_inbox_provider_account_idx ON webhook_inbox (provider, provider_account_id, received_at DESC);

COMMIT;
