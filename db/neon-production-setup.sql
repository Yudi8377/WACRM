-- =============================================================================
-- WACRM — Complete Idempotent Neon PostgreSQL Setup Script (Migrations 0001-0007)
-- Target Project : small-tree-35716017 (WACRM — AWS Singapore)
-- Target Branch  : br-patient-mud-a1xi2iun (production)
-- Console URL    : https://console.neon.tech/app/projects/small-tree-35716017/branches/br-patient-mud-a1xi2iun
--
-- Safe to run multiple times (fully idempotent).
-- Run in Neon SQL Editor or via: psql "$DATABASE_URL" -f db/neon-production-setup.sql
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS app_private;

-- 1. Core multi-tenant tables
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
  company text,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  lifecycle_stage text NOT NULL DEFAULT 'lead',
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lifecycle_stage text NOT NULL DEFAULT 'lead';

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
  priority text NOT NULL DEFAULT 'normal',
  tags text[] NOT NULL DEFAULT '{}',
  unread_count integer NOT NULL DEFAULT 0,
  subject text,
  assigned_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, channel, external_conversation_id)
);

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS unread_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subject text;

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
  client_request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, channel, external_message_id)
);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_request_id uuid;

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
  next_attempt_at timestamptz,
  processing_started_at timestamptz,
  UNIQUE (provider, event_key)
);

ALTER TABLE webhook_inbox
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;

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

-- 2. Composite tenant constraints (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'channel_connections_tenant_id_unique') THEN
    ALTER TABLE channel_connections ADD CONSTRAINT channel_connections_tenant_id_unique UNIQUE (tenant_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_tenant_id_unique') THEN
    ALTER TABLE contacts ADD CONSTRAINT contacts_tenant_id_unique UNIQUE (tenant_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_tenant_id_unique') THEN
    ALTER TABLE conversations ADD CONSTRAINT conversations_tenant_id_unique UNIQUE (tenant_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_channel_identity_same_tenant_fk') THEN
    ALTER TABLE contact_channel_identities ADD CONSTRAINT contact_channel_identity_same_tenant_fk
      FOREIGN KEY (tenant_id, contact_id) REFERENCES contacts (tenant_id, id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_connection_same_tenant_fk') THEN
    ALTER TABLE conversations ADD CONSTRAINT conversations_connection_same_tenant_fk
      FOREIGN KEY (tenant_id, connection_id) REFERENCES channel_connections (tenant_id, id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_contact_same_tenant_fk') THEN
    ALTER TABLE conversations ADD CONSTRAINT conversations_contact_same_tenant_fk
      FOREIGN KEY (tenant_id, contact_id) REFERENCES contacts (tenant_id, id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_conversation_same_tenant_fk') THEN
    ALTER TABLE messages ADD CONSTRAINT messages_conversation_same_tenant_fk
      FOREIGN KEY (tenant_id, conversation_id) REFERENCES conversations (tenant_id, id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_lifecycle_stage_check') THEN
    ALTER TABLE contacts ADD CONSTRAINT contacts_lifecycle_stage_check
      CHECK (lifecycle_stage IN ('lead', 'prospect', 'customer', 'vip', 'inactive'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_priority_check') THEN
    ALTER TABLE conversations ADD CONSTRAINT conversations_priority_check
      CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_unread_count_check') THEN
    ALTER TABLE conversations ADD CONSTRAINT conversations_unread_count_check
      CHECK (unread_count >= 0);
  END IF;
END $$;

-- 3. CRM productivity tables (0007)
CREATE TABLE IF NOT EXISTS conversation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL,
  author_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  body_text text NOT NULL CHECK (length(trim(body_text)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversation_notes_same_tenant_fk
    FOREIGN KEY (tenant_id, conversation_id) REFERENCES conversations (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shortcut text NOT NULL CHECK (shortcut ~ '^[a-z0-9_-]{2,40}$'),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
  body_text text NOT NULL CHECK (length(trim(body_text)) BETWEEN 1 AND 4096),
  category text NOT NULL DEFAULT 'umum' CHECK (length(trim(category)) BETWEEN 1 AND 60),
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, shortcut)
);

CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','facebook_messenger','instagram','tiktok','youtube')),
  name text NOT NULL CHECK (name ~ '^[a-z0-9_]{2,80}$'),
  category text NOT NULL DEFAULT 'utility' CHECK (category IN ('utility','marketing','authentication','service')),
  language text NOT NULL DEFAULT 'id' CHECK (length(trim(language)) BETWEEN 2 AND 16),
  body_text text NOT NULL CHECK (length(trim(body_text)) BETWEEN 1 AND 4096),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','rejected','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, channel, name)
);

-- 4. Better Auth tables (0004)
CREATE TABLE IF NOT EXISTS "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  image text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "session" (
  id text PRIMARY KEY,
  "expiresAt" timestamp NOT NULL,
  token text NOT NULL UNIQUE,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  id text PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamp,
  "refreshTokenExpiresAt" timestamp,
  scope text,
  password text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS contacts_tenant_created_idx ON contacts (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS contacts_tenant_phone_idx ON contacts (tenant_id, phone_e164) WHERE phone_e164 IS NOT NULL;
CREATE INDEX IF NOT EXISTS contacts_tenant_stage_idx ON contacts (tenant_id, lifecycle_stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS conversations_tenant_inbox_idx ON conversations (tenant_id, status, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS messages_tenant_conversation_idx ON messages (tenant_id, conversation_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS messages_tenant_client_request_unique ON messages (tenant_id, client_request_id) WHERE client_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS webhook_events_status_idx ON webhook_events (processing_status, received_at);
CREATE INDEX IF NOT EXISTS webhook_inbox_status_idx ON webhook_inbox (processing_status, received_at);
CREATE INDEX IF NOT EXISTS webhook_inbox_provider_account_idx ON webhook_inbox (provider, provider_account_id, received_at DESC);
CREATE INDEX IF NOT EXISTS webhook_inbox_worker_queue_idx ON webhook_inbox (processing_status, next_attempt_at, received_at) WHERE signature_verified = true;
CREATE INDEX IF NOT EXISTS audit_logs_tenant_created_idx ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS conversation_notes_tenant_conv_idx ON conversation_notes (tenant_id, conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quick_replies_tenant_cat_idx ON quick_replies (tenant_id, category, shortcut);
CREATE INDEX IF NOT EXISTS message_templates_tenant_channel_idx ON message_templates (tenant_id, channel, status);
CREATE INDEX IF NOT EXISTS session_user_id_idx ON "session" ("userId");
CREATE INDEX IF NOT EXISTS account_user_id_idx ON "account" ("userId");
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification (identifier);

-- 6. Row-Level Security (RLS) on all tenant tables
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'channel_connections','contacts','contact_channel_identities','conversations',
    'messages','audit_logs','api_keys','conversation_notes','quick_replies','message_templates'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      tbl
    );
  END LOOP;
END $$;

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
  USING (
    id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.tenant_id = organizations.id
        AND om.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
        AND om.status = 'active'
    )
  )
  WITH CHECK (id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_members_tenant_isolation ON organization_members;
DROP POLICY IF EXISTS organization_members_select_self_or_tenant ON organization_members;
DROP POLICY IF EXISTS organization_members_insert_tenant ON organization_members;
DROP POLICY IF EXISTS organization_members_update_tenant ON organization_members;
DROP POLICY IF EXISTS organization_members_delete_tenant ON organization_members;
CREATE POLICY organization_members_select_self_or_tenant ON organization_members
  FOR SELECT
  USING (
    user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );
CREATE POLICY organization_members_insert_tenant ON organization_members
  FOR INSERT WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY organization_members_update_tenant ON organization_members
  FOR UPDATE
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY organization_members_delete_tenant ON organization_members
  FOR DELETE USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_profile_read_same_tenant ON user_profiles;
DROP POLICY IF EXISTS user_profile_insert_self ON user_profiles;
DROP POLICY IF EXISTS user_profile_update_self ON user_profiles;
CREATE POLICY user_profile_read_same_tenant ON user_profiles
  FOR SELECT
  USING (
    id = NULLIF(current_setting('app.user_id', true), '')::uuid
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = user_profiles.id
        AND om.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        AND om.status = 'active'
    )
  );
CREATE POLICY user_profile_insert_self ON user_profiles
  FOR INSERT WITH CHECK (id = NULLIF(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY user_profile_update_self ON user_profiles
  FOR UPDATE
  USING (id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('app.user_id', true), '')::uuid);

ALTER TABLE webhook_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_inbox FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS webhook_inbox_verified_insert ON webhook_inbox;
CREATE POLICY webhook_inbox_verified_insert ON webhook_inbox
  FOR INSERT WITH CHECK (signature_verified = true);
DROP POLICY IF EXISTS webhook_inbox_worker_select ON webhook_inbox;
CREATE POLICY webhook_inbox_worker_select ON webhook_inbox
  FOR SELECT USING (current_user = 'wacrm_worker' AND signature_verified = true);
DROP POLICY IF EXISTS webhook_inbox_worker_update ON webhook_inbox;
CREATE POLICY webhook_inbox_worker_update ON webhook_inbox
  FOR UPDATE
  USING (current_user = 'wacrm_worker' AND signature_verified = true)
  WITH CHECK (current_user = 'wacrm_worker' AND signature_verified = true);

DROP POLICY IF EXISTS channel_connections_worker_lookup ON channel_connections;
CREATE POLICY channel_connections_worker_lookup ON channel_connections
  FOR SELECT USING (current_user = 'wacrm_worker' AND channel = 'whatsapp' AND status = 'connected');

-- 7. Conditional least-privilege grants when roles exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wacrm_runtime') THEN
    GRANT USAGE ON SCHEMA public TO wacrm_runtime;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wacrm_runtime;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wacrm_runtime;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wacrm_worker') THEN
    GRANT USAGE ON SCHEMA public TO wacrm_worker;
    GRANT SELECT (id, provider, event_key, provider_account_id, payload, signature_verified,
                  processing_status, attempt_count, received_at, processed_at, last_error_code,
                  next_attempt_at, processing_started_at)
      ON webhook_inbox TO wacrm_worker;
    GRANT UPDATE (processing_status, attempt_count, processed_at, last_error_code,
                  next_attempt_at, processing_started_at)
      ON webhook_inbox TO wacrm_worker;
    GRANT SELECT (id, tenant_id, external_account_id, channel, status)
      ON channel_connections TO wacrm_worker;
    GRANT SELECT, INSERT, UPDATE
      ON contacts, contact_channel_identities, conversations, messages
      TO wacrm_worker;
  END IF;
END $$;

COMMIT;
