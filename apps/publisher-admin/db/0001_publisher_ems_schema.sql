-- WACRM Publisher HQ — Standalone Enterprise Management System Schema
-- Strictly isolated from client-facing WACRM tenant databases.

CREATE SCHEMA IF NOT EXISTS publisher_ems;

CREATE TABLE IF NOT EXISTS publisher_ems.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  npwp TEXT DEFAULT '-',
  industry TEXT NOT NULL,
  pic_name TEXT NOT NULL,
  pic_email TEXT NOT NULL,
  pic_whatsapp TEXT,
  domain TEXT NOT NULL,
  city TEXT,
  reseller_id UUID,
  status TEXT NOT NULL DEFAULT 'onboarding',
  monthly_cloud_cogs_idr BIGINT NOT NULL DEFAULT 0,
  monthly_ai_token_cost_idr BIGINT NOT NULL DEFAULT 0,
  health_score INT NOT NULL DEFAULT 95,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS publisher_ems.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT NOT NULL UNIQUE,
  tenant_id UUID NOT NULL REFERENCES publisher_ems.tenants(id) ON DELETE RESTRICT,
  domain TEXT NOT NULL,
  edition_id TEXT NOT NULL CHECK (edition_id IN ('starter', 'pro', 'enterprise', 'sovereign')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual', 'perpetual', 'trial')),
  status TEXT NOT NULL CHECK (status IN ('active', 'trial', 'grace_period', 'suspended', 'expired', 'revoked')),
  max_seats INT NOT NULL,
  used_seats INT NOT NULL DEFAULT 1,
  max_ai_agents INT NOT NULL,
  max_branches INT NOT NULL,
  monthly_value_idr BIGINT NOT NULL DEFAULT 0,
  issued_at DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at DATE NOT NULL,
  last_heartbeat_at TIMESTAMPTZ,
  entitlements JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS publisher_ems.license_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT NOT NULL,
  tenant_name TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS publisher_ems.skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('license', 'addon', 'hardware', 'service')),
  edition_id TEXT,
  billing_cycle TEXT NOT NULL,
  unit_price_idr BIGINT NOT NULL DEFAULT 0,
  cost_price_idr BIGINT NOT NULL DEFAULT 0,
  stock_qty INT NOT NULL DEFAULT 0,
  min_stock INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS publisher_ems.resellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('silver', 'gold', 'platinum')),
  pic_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.1000,
  total_commission_earned_idr BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS publisher_ems.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  npwp TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  monthly_estimate_idr BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS publisher_ems.crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_whatsapp TEXT,
  industry TEXT,
  target_edition TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  requested_seats INT NOT NULL DEFAULT 15,
  deal_value_idr BIGINT NOT NULL DEFAULT 0,
  probability INT NOT NULL DEFAULT 30,
  stage TEXT NOT NULL DEFAULT 'lead',
  reseller_id UUID REFERENCES publisher_ems.resellers(id),
  expected_close_date DATE,
  converted_license_id UUID REFERENCES publisher_ems.licenses(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS publisher_ems.subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  tenant_id UUID NOT NULL REFERENCES publisher_ems.tenants(id),
  license_id UUID REFERENCES publisher_ems.licenses(id),
  sku_code TEXT NOT NULL,
  description TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  period_months INT NOT NULL DEFAULT 1,
  subtotal_idr BIGINT NOT NULL,
  ppn_rate NUMERIC(5,4) NOT NULL DEFAULT 0.1100,
  ppn_amount_idr BIGINT NOT NULL DEFAULT 0,
  total_idr BIGINT NOT NULL,
  reseller_id UUID REFERENCES publisher_ems.resellers(id),
  reseller_commission_idr BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'issued',
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_date DATE,
  journal_id UUID
);

CREATE TABLE IF NOT EXISTS publisher_ems.chart_of_accounts (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'cogs', 'expense')),
  normal_balance TEXT NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
  category TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS publisher_ems.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_number TEXT NOT NULL UNIQUE,
  entry_date DATE NOT NULL,
  reference TEXT NOT NULL,
  description TEXT NOT NULL,
  source_module TEXT NOT NULL,
  total_debit BIGINT NOT NULL CHECK (total_debit > 0),
  total_credit BIGINT NOT NULL CHECK (total_credit = total_debit),
  posted_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS publisher_ems.journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES publisher_ems.journal_entries(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL REFERENCES publisher_ems.chart_of_accounts(code),
  debit BIGINT NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit BIGINT NOT NULL DEFAULT 0 CHECK (credit >= 0),
  memo TEXT
);
