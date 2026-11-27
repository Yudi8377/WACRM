-- 0010_telemetry_feedback_economics.sql
-- Usage telemetry, user feedback & photo testimonials, and anonymized UMKM economic trend signals
-- Synchronized live into WACRM Publisher HQ Executive Intelligence.

CREATE TABLE IF NOT EXISTS publisher_usage_events (
  id TEXT PRIMARY KEY,
  tenant_email TEXT NOT NULL,
  business_name TEXT NOT NULL DEFAULT '',
  edition_id TEXT NOT NULL DEFAULT 'starter',
  platform TEXT NOT NULL DEFAULT 'web',
  region TEXT NOT NULL DEFAULT 'Indonesia',
  feature_key TEXT NOT NULL DEFAULT 'inbox',
  duration_seconds INTEGER NOT NULL DEFAULT 30,
  local_hour SMALLINT NOT NULL DEFAULT 10,
  session_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pub_usage_created
  ON publisher_usage_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pub_usage_feature
  ON publisher_usage_events (feature_key);
CREATE INDEX IF NOT EXISTS idx_pub_usage_region
  ON publisher_usage_events (region);

CREATE TABLE IF NOT EXISTS publisher_user_feedback (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'feedback', -- 'feedback' | 'testimonial'
  tenant_email TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL,
  business_name TEXT NOT NULL DEFAULT '',
  edition_id TEXT NOT NULL DEFAULT 'starter',
  region TEXT NOT NULL DEFAULT 'Indonesia',
  category TEXT NOT NULL DEFAULT 'Umum',
  rating SMALLINT NOT NULL DEFAULT 5,
  usefulness TEXT NOT NULL DEFAULT 'very_useful', -- 'very_useful' | 'useful' | 'needs_work'
  sentiment TEXT NOT NULL DEFAULT 'positive', -- 'positive' | 'neutral' | 'constructive'
  headline TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  photo_data_url TEXT,
  action_status TEXT NOT NULL DEFAULT 'new', -- 'new' | 'reviewed' | 'planned' | 'resolved'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pub_feedback_kind_created
  ON publisher_user_feedback (kind, created_at DESC);

CREATE TABLE IF NOT EXISTS publisher_market_signals (
  id TEXT PRIMARY KEY,
  tenant_email TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT 'Indonesia',
  product_category TEXT NOT NULL DEFAULT 'UMKM Umum',
  product_name TEXT NOT NULL DEFAULT '',
  avg_price_idr BIGINT NOT NULL DEFAULT 0,
  units_sold INTEGER NOT NULL DEFAULT 1,
  order_value_idr BIGINT NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'qris',
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  buyer_hour SMALLINT NOT NULL DEFAULT 12,
  repeat_buyer BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pub_market_created
  ON publisher_market_signals (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pub_market_cat
  ON publisher_market_signals (product_category);
