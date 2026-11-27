-- WACRM Migration 0008: Multi-Agent AI Swarm, Autonomous Knowledge Base,
-- Security Sentinel & Self-Healing Incidents, POS + Invoice + QR Generator,
-- ERP Inventory/Suppliers, and Double-Entry Accounting Ledger.
-- All tables enforce multi-tenant Row-Level Security (ENABLE + FORCE RLS).

BEGIN;

-- 1. Multi-Agent AI Configurations
CREATE TABLE IF NOT EXISTS ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_key text NOT NULL CHECK (agent_key IN ('cs_sales','order_pos','knowledge_learner','fraud_sentinel','system_guardian','companion_guide','followup_hunter','procurement_forecast')),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  role_description text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  auto_reply_enabled boolean NOT NULL DEFAULT true,
  autonomous_learning boolean NOT NULL DEFAULT true,
  autonomous_healing boolean NOT NULL DEFAULT true,
  confidence_threshold numeric(4,2) NOT NULL DEFAULT 0.72 CHECK (confidence_threshold BETWEEN 0.10 AND 1.00),
  system_prompt text NOT NULL DEFAULT '',
  actions_executed integer NOT NULL DEFAULT 0 CHECK (actions_executed >= 0),
  last_run_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, agent_key)
);

-- 2. Generative AI Knowledge Base (auto-updated from products, chats, orders, SOP)
CREATE TABLE IF NOT EXISTS ai_knowledge_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('product','chat','order','sop','autonomous_learning')),
  source_id text,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 180),
  content text NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 8000),
  tags text[] NOT NULL DEFAULT '{}',
  confidence numeric(4,2) NOT NULL DEFAULT 0.90 CHECK (confidence BETWEEN 0.00 AND 1.00),
  usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  auto_generated boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_knowledge_tenant_idx ON ai_knowledge_items (tenant_id, source_type, updated_at DESC);

-- 3. Fraud Detection & Autonomous Self-Healing Security Incidents
CREATE TABLE IF NOT EXISTS ai_security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_key text NOT NULL CHECK (agent_key IN ('fraud_sentinel','system_guardian')),
  category text NOT NULL CHECK (category IN ('fraud_order','price_anomaly','duplicate_invoice','stock_mismatch','ledger_imbalance','webhook_stall','auth_anomaly','system_health')),
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  risk_score integer NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 180),
  description text NOT NULL,
  self_healed boolean NOT NULL DEFAULT false,
  healing_action text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','mitigated','resolved','false_positive')),
  related_entity_type text,
  related_entity_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS ai_security_tenant_idx ON ai_security_incidents (tenant_id, status, created_at DESC);

-- 4. ERP Product Catalog & Inventory
CREATE TABLE IF NOT EXISTS erp_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sku text NOT NULL CHECK (length(trim(sku)) BETWEEN 1 AND 64),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 180),
  category text NOT NULL DEFAULT 'Umum',
  description text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT 'pcs',
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  cost_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  stock_qty integer NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  min_stock integer NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sku)
);

CREATE INDEX IF NOT EXISTS erp_products_tenant_idx ON erp_products (tenant_id, category, name);

-- 5. ERP Suppliers
CREATE TABLE IF NOT EXISTS erp_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 160),
  contact_person text,
  phone text,
  email text,
  address text,
  payment_terms text NOT NULL DEFAULT 'NET 14',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. ERP Stock Movements Ledger
CREATE TABLE IF NOT EXISTS erp_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES erp_products(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('in','out','adjustment','auto_restock')),
  quantity integer NOT NULL CHECK (quantity <> 0),
  reference_type text,
  reference_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS erp_stock_movements_idx ON erp_stock_movements (tenant_id, created_at DESC);

-- 7. POS Orders & Auto-Generated Invoices + QR Payment Payloads
CREATE TABLE IF NOT EXISTS pos_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number text NOT NULL CHECK (length(trim(invoice_number)) BETWEEN 4 AND 64),
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  customer_name text NOT NULL CHECK (length(trim(customer_name)) BETWEEN 1 AND 160),
  customer_phone text,
  shipping_address text NOT NULL DEFAULT '',
  channel text NOT NULL DEFAULT 'whatsapp',
  subtotal numeric(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  payment_method text NOT NULL DEFAULT 'qris' CHECK (payment_method IN ('qris','bank_transfer','cash','cod','credit')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded','flagged')),
  order_status text NOT NULL DEFAULT 'confirmed' CHECK (order_status IN ('draft','confirmed','packed','shipped','completed','cancelled')),
  qr_payload text NOT NULL,
  ai_generated boolean NOT NULL DEFAULT false,
  fraud_risk_score integer NOT NULL DEFAULT 0 CHECK (fraud_risk_score BETWEEN 0 AND 100),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS pos_orders_tenant_idx ON pos_orders (tenant_id, created_at DESC);

-- 8. POS Order Line Items
CREATE TABLE IF NOT EXISTS pos_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES erp_products(id) ON DELETE SET NULL,
  sku text NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  cost_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  line_total numeric(14,2) NOT NULL CHECK (line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Double-Entry Accounting Ledger
CREATE TABLE IF NOT EXISTS accounting_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entry_number text NOT NULL CHECK (length(trim(entry_number)) BETWEEN 3 AND 64),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  account_code text NOT NULL CHECK (length(trim(account_code)) BETWEEN 3 AND 20),
  account_name text NOT NULL CHECK (length(trim(account_name)) BETWEEN 2 AND 120),
  account_type text NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense','cogs')),
  debit numeric(14,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit numeric(14,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  reference_type text,
  reference_id text,
  description text NOT NULL DEFAULT '',
  ai_verified boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT (debit = 0 AND credit = 0))
);

CREATE INDEX IF NOT EXISTS accounting_entries_tenant_idx ON accounting_entries (tenant_id, entry_date DESC, created_at DESC);

-- Enable & Force Row-Level Security on ALL 9 new multi-tenant tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'ai_agents',
    'ai_knowledge_items',
    'ai_security_incidents',
    'erp_products',
    'erp_suppliers',
    'erp_stock_movements',
    'pos_orders',
    'pos_order_items',
    'accounting_entries'
  ]
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

-- Conditional grants for least-privilege runtime role
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wacrm_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON
      ai_agents,
      ai_knowledge_items,
      ai_security_incidents,
      erp_products,
      erp_suppliers,
      erp_stock_movements,
      pos_orders,
      pos_order_items,
      accounting_entries
    TO wacrm_runtime;
  END IF;
END $$;

COMMIT;
