BEGIN;

-- Enrich contacts with CRM lifecycle, company, tags, and notes.
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lifecycle_stage text NOT NULL DEFAULT 'lead';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_lifecycle_stage_check'
  ) THEN
    ALTER TABLE contacts
      ADD CONSTRAINT contacts_lifecycle_stage_check
      CHECK (lifecycle_stage IN ('lead', 'prospect', 'customer', 'vip', 'inactive'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS contacts_tenant_stage_idx
  ON contacts (tenant_id, lifecycle_stage, updated_at DESC);

-- Enrich conversations with priority, subject, tags, and unread counter.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS unread_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subject text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_priority_check'
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT conversations_priority_check
      CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_unread_count_check'
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT conversations_unread_count_check
      CHECK (unread_count >= 0);
  END IF;
END $$;

-- Internal team notes attached to a conversation (never sent to customer).
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
CREATE INDEX IF NOT EXISTS conversation_notes_tenant_conv_idx
  ON conversation_notes (tenant_id, conversation_id, created_at DESC);

-- Reusable canned responses for customer service agents.
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
CREATE INDEX IF NOT EXISTS quick_replies_tenant_cat_idx
  ON quick_replies (tenant_id, category, shortcut);

-- Channel message templates (WhatsApp Business & Omnichannel).
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
CREATE INDEX IF NOT EXISTS message_templates_tenant_channel_idx
  ON message_templates (tenant_id, channel, status);

-- Enforce strict tenant RLS on all newly created tables.
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['conversation_notes', 'quick_replies', 'message_templates']
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

-- Allow organization owners to update/delete organizations when tenant context matches.
-- Also allow authenticated user to SELECT organizations they belong to while listing workspaces.
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

COMMIT;
