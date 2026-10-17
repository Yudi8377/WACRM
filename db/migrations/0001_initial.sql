BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS app_private;

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 160),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'agent' CHECK (role IN ('owner','admin','supervisor','agent','viewer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS channel_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('whatsapp','facebook_messenger','instagram','tiktok','youtube')),
  display_name text NOT NULL,
  external_account_id text NOT NULL,
  external_business_id text,
  token_ciphertext text,
  token_nonce text,
  token_key_version integer,
  token_expires_at timestamptz,
  scopes text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','connected','needs_reauth','disabled','error')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, channel, external_account_id),
  CHECK ((token_ciphertext IS NULL AND token_nonce IS NULL AND token_key_version IS NULL) OR (token_ciphertext IS NOT NULL AND token_nonce IS NOT NULL AND token_key_version IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  display_name text,
  phone_e164 text,
  email text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contacts_tenant_created_idx ON contacts (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS contacts_tenant_phone_idx ON contacts (tenant_id, phone_e164) WHERE phone_e164 IS NOT NULL;

CREATE TABLE IF NOT EXISTS contact_channel_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('whatsapp','facebook_messenger','instagram','tiktok','youtube')),
  external_contact_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, channel, external_contact_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES channel_connections(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('whatsapp','facebook_messenger','instagram','tiktok','youtube')),
  external_conversation_id text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','resolved','archived')),
  assigned_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, channel, external_conversation_id)
);
CREATE INDEX IF NOT EXISTS conversations_tenant_inbox_idx ON conversations (tenant_id, status, last_message_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('whatsapp','facebook_messenger','instagram','tiktok','youtube')),
  external_message_id text,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound','system')),
  message_type text NOT NULL DEFAULT 'text',
  body_text text,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  delivery_status text NOT NULL DEFAULT 'received' CHECK (delivery_status IN ('received','queued','sent','delivered','read','failed')),
  provider_timestamp timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, channel, external_message_id)
);
CREATE INDEX IF NOT EXISTS messages_tenant_conversation_idx ON messages (tenant_id, conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('whatsapp','facebook_messenger','instagram','tiktok','youtube')),
  external_event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processing_status text NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received','processing','processed','retry','dead_letter','ignored')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  last_error_code text,
  UNIQUE (channel, external_event_id)
);
CREATE INDEX IF NOT EXISTS webhook_events_status_idx ON webhook_events (processing_status, received_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  request_id text,
  ip_hash text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_tenant_created_idx ON audit_logs (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT '{}',
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tenant RLS uses a transaction-local context set only after server-side membership authorization.
-- The application DB role must not be a superuser or have BYPASSRLS.
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['channel_connections','contacts','contact_channel_identities','conversations','messages','audit_logs','api_keys']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)', tbl);
  END LOOP;
END $$;

-- Webhook events are written by the trusted webhook worker. Keep RLS enabled and restrict access in the application role.
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS webhook_tenant_isolation ON webhook_events;
CREATE POLICY webhook_tenant_isolation ON webhook_events
  USING (tenant_id IS NOT NULL AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id IS NOT NULL AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_member_access ON organizations;
CREATE POLICY organization_member_access ON organizations
  USING (id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_members_tenant_isolation ON organization_members;
CREATE POLICY organization_members_tenant_isolation ON organization_members
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

COMMIT;
