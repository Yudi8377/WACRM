-- 0009_editions_seo_superadmin.sql
-- WACRM v4.0.0:
--   1. Upgrade ai_agents to 9 autonomous agents (adding seo_growth)
--   2. Add multi-edition tenant_subscriptions table with strict Tenant RLS
--   3. Add omnichannel seo_campaigns table with strict Tenant RLS

BEGIN;

-- 1. Upgrade ai_agents CHECK constraint to include all 9 agent keys
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'ai_agents'::regclass
      AND conname = 'ai_agents_agent_key_check'
  ) THEN
    ALTER TABLE ai_agents DROP CONSTRAINT ai_agents_agent_key_check;
  END IF;
  ALTER TABLE ai_agents ADD CONSTRAINT ai_agents_agent_key_check CHECK (
    agent_key IN (
      'cs_sales',
      'order_pos',
      'knowledge_learner',
      'fraud_sentinel',
      'system_guardian',
      'companion_guide',
      'followup_hunter',
      'procurement_forecast',
      'seo_growth'
    )
  );
END $$;

-- 2. Tenant Subscriptions & Multi-Edition Tier Management
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  edition_id text NOT NULL DEFAULT 'enterprise' CHECK (edition_id IN ('starter','pro','enterprise','sovereign')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','trial','past_due','suspended')),
  monthly_price_idr numeric(14,2) NOT NULL DEFAULT 699000 CHECK (monthly_price_idr >= 0),
  seat_limit integer NOT NULL DEFAULT 50 CHECK (seat_limit >= 1),
  product_limit integer NOT NULL DEFAULT 10000 CHECK (product_limit >= 1),
  auto_renew boolean NOT NULL DEFAULT true,
  trial_ends_at timestamptz,
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  super_admin_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenant_subscriptions_edition_idx ON tenant_subscriptions (edition_id, status);

-- 3. Omnichannel SEO Campaigns & Product SEO Audits
CREATE TABLE IF NOT EXISTS seo_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES erp_products(id) ON DELETE SET NULL,
  product_sku text NOT NULL,
  product_name text NOT NULL,
  seo_score integer NOT NULL DEFAULT 0 CHECK (seo_score BETWEEN 0 AND 100),
  slug text NOT NULL,
  meta_title text NOT NULL,
  meta_description text NOT NULL,
  keywords text[] NOT NULL DEFAULT ARRAY[]::text[],
  channel_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, product_sku)
);

CREATE INDEX IF NOT EXISTS seo_campaigns_tenant_idx ON seo_campaigns (tenant_id, seo_score DESC, updated_at DESC);

-- Enable & Force Row-Level Security on both new tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['tenant_subscriptions', 'seo_campaigns']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_tenant_isolation ON %I USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      tbl,
      tbl
    );
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wacrm_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_subscriptions, seo_campaigns TO wacrm_runtime;
  END IF;
END $$;

COMMIT;
