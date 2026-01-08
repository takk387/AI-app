-- Migration: Create api_usage and api_usage_monthly tables
-- Purpose: Track managed API service usage for billing

-- Create api_usage table (individual requests)
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id UUID REFERENCES deployed_apps(id) ON DELETE SET NULL,

  -- Service details
  service TEXT NOT NULL CHECK (service IN ('openai', 'anthropic', 'sendgrid', 'resend', 'twilio', 'storage')),
  endpoint TEXT NOT NULL,

  -- Usage metrics
  units INTEGER NOT NULL, -- tokens, emails, SMS, bytes
  unit_type TEXT NOT NULL CHECK (unit_type IN ('tokens', 'emails', 'sms', 'bytes', 'requests')),
  cost_cents INTEGER NOT NULL,

  -- Request metadata
  request_metadata JSONB DEFAULT '{}'::JSONB,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_api_usage_user_date ON api_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_app ON api_usage(app_id, created_at DESC) WHERE app_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_usage_service ON api_usage(service, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage(created_at DESC);

-- Partition hint for future optimization (comment for reference)
-- PARTITION BY RANGE (created_at) could be added for high-volume tables

-- Enable Row Level Security
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own api usage" ON api_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Note: Service role bypasses RLS entirely; this policy allows users to insert their own usage
CREATE POLICY "Users can insert own api usage" ON api_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create api_usage_monthly table (aggregated for billing)
CREATE TABLE IF NOT EXISTS api_usage_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Period
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),

  -- OpenAI usage
  openai_tokens BIGINT DEFAULT 0,
  openai_cost_cents INTEGER DEFAULT 0,

  -- Anthropic usage
  anthropic_tokens BIGINT DEFAULT 0,
  anthropic_cost_cents INTEGER DEFAULT 0,

  -- SendGrid usage
  sendgrid_emails INTEGER DEFAULT 0,
  sendgrid_cost_cents INTEGER DEFAULT 0,

  -- Resend usage
  resend_emails INTEGER DEFAULT 0,
  resend_cost_cents INTEGER DEFAULT 0,

  -- Twilio usage
  twilio_sms INTEGER DEFAULT 0,
  twilio_cost_cents INTEGER DEFAULT 0,

  -- Storage usage
  storage_bytes BIGINT DEFAULT 0,
  storage_cost_cents INTEGER DEFAULT 0,

  -- Totals
  total_cost_cents INTEGER DEFAULT 0,

  -- Stripe invoice
  stripe_invoice_id TEXT,
  invoiced_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one record per user per month
  UNIQUE(user_id, period_year, period_month)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_monthly_user ON api_usage_monthly(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_monthly_period ON api_usage_monthly(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_api_usage_monthly_invoice ON api_usage_monthly(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE api_usage_monthly ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own monthly usage" ON api_usage_monthly
  FOR SELECT USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_api_usage_monthly_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS api_usage_monthly_updated ON api_usage_monthly;
CREATE TRIGGER api_usage_monthly_updated
  BEFORE UPDATE ON api_usage_monthly
  FOR EACH ROW EXECUTE FUNCTION update_api_usage_monthly_timestamp();

-- Function to aggregate usage into monthly table
CREATE OR REPLACE FUNCTION aggregate_api_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM NEW.created_at);
  v_month := EXTRACT(MONTH FROM NEW.created_at);

  INSERT INTO api_usage_monthly (user_id, period_year, period_month)
  VALUES (NEW.user_id, v_year, v_month)
  ON CONFLICT (user_id, period_year, period_month) DO NOTHING;

  -- Update the appropriate column based on service
  CASE NEW.service
    WHEN 'openai' THEN
      UPDATE api_usage_monthly
      SET openai_tokens = openai_tokens + NEW.units,
          openai_cost_cents = openai_cost_cents + NEW.cost_cents,
          total_cost_cents = total_cost_cents + NEW.cost_cents
      WHERE user_id = NEW.user_id AND period_year = v_year AND period_month = v_month;
    WHEN 'anthropic' THEN
      UPDATE api_usage_monthly
      SET anthropic_tokens = anthropic_tokens + NEW.units,
          anthropic_cost_cents = anthropic_cost_cents + NEW.cost_cents,
          total_cost_cents = total_cost_cents + NEW.cost_cents
      WHERE user_id = NEW.user_id AND period_year = v_year AND period_month = v_month;
    WHEN 'sendgrid' THEN
      UPDATE api_usage_monthly
      SET sendgrid_emails = sendgrid_emails + NEW.units,
          sendgrid_cost_cents = sendgrid_cost_cents + NEW.cost_cents,
          total_cost_cents = total_cost_cents + NEW.cost_cents
      WHERE user_id = NEW.user_id AND period_year = v_year AND period_month = v_month;
    WHEN 'resend' THEN
      UPDATE api_usage_monthly
      SET resend_emails = resend_emails + NEW.units,
          resend_cost_cents = resend_cost_cents + NEW.cost_cents,
          total_cost_cents = total_cost_cents + NEW.cost_cents
      WHERE user_id = NEW.user_id AND period_year = v_year AND period_month = v_month;
    WHEN 'twilio' THEN
      UPDATE api_usage_monthly
      SET twilio_sms = twilio_sms + NEW.units,
          twilio_cost_cents = twilio_cost_cents + NEW.cost_cents,
          total_cost_cents = total_cost_cents + NEW.cost_cents
      WHERE user_id = NEW.user_id AND period_year = v_year AND period_month = v_month;
    WHEN 'storage' THEN
      UPDATE api_usage_monthly
      SET storage_bytes = storage_bytes + NEW.units,
          storage_cost_cents = storage_cost_cents + NEW.cost_cents,
          total_cost_cents = total_cost_cents + NEW.cost_cents
      WHERE user_id = NEW.user_id AND period_year = v_year AND period_month = v_month;
    ELSE
      -- Unknown service type - still update total cost but log warning
      UPDATE api_usage_monthly
      SET total_cost_cents = total_cost_cents + NEW.cost_cents
      WHERE user_id = NEW.user_id AND period_year = v_year AND period_month = v_month;
      RAISE WARNING 'Unknown API service type: %', NEW.service;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to aggregate usage on insert
DROP TRIGGER IF EXISTS api_usage_aggregate ON api_usage;
CREATE TRIGGER api_usage_aggregate
  AFTER INSERT ON api_usage
  FOR EACH ROW EXECUTE FUNCTION aggregate_api_usage();

-- Add comments
COMMENT ON TABLE api_usage IS 'Individual API usage records for managed services';
COMMENT ON TABLE api_usage_monthly IS 'Monthly aggregated API usage for billing';
COMMENT ON COLUMN api_usage.service IS 'Managed API service: openai, anthropic, sendgrid, twilio, storage';
COMMENT ON COLUMN api_usage.units IS 'Usage units: tokens for AI, count for emails/SMS, bytes for storage';
COMMENT ON COLUMN api_usage_monthly.total_cost_cents IS 'Total cost for the month in cents';
