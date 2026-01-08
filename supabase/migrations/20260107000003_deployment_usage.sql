-- Migration: Create deployment_usage table
-- Purpose: Track per-deployment resource usage (database, hosting, bandwidth)

-- Create deployment_usage table
CREATE TABLE IF NOT EXISTS deployment_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployed_app_id UUID NOT NULL REFERENCES deployed_apps(id) ON DELETE CASCADE,

  -- Period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Database usage
  db_reads BIGINT DEFAULT 0,
  db_writes BIGINT DEFAULT 0,
  db_storage_bytes BIGINT DEFAULT 0,

  -- Hosting usage
  requests BIGINT DEFAULT 0,
  bandwidth_bytes BIGINT DEFAULT 0,
  compute_ms BIGINT DEFAULT 0, -- Edge compute milliseconds

  -- Costs (in cents)
  database_cost_cents INTEGER DEFAULT 0,
  hosting_cost_cents INTEGER DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one record per deployment per period
  UNIQUE(deployed_app_id, period_start)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_deployment_usage_app ON deployment_usage(deployed_app_id);
CREATE INDEX IF NOT EXISTS idx_deployment_usage_period ON deployment_usage(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_deployment_usage_created ON deployment_usage(created_at DESC);

-- Enable Row Level Security
ALTER TABLE deployment_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view usage for their own deployments
CREATE POLICY "Users can view own deployment usage" ON deployment_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deployed_apps
      WHERE deployed_apps.id = deployment_usage.deployed_app_id
      AND deployed_apps.user_id = auth.uid()
    )
  );

-- Function to auto-update updated_at and calculate total_cost
CREATE OR REPLACE FUNCTION update_deployment_usage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.total_cost_cents = COALESCE(NEW.database_cost_cents, 0) + COALESCE(NEW.hosting_cost_cents, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp and total
DROP TRIGGER IF EXISTS deployment_usage_updated ON deployment_usage;
CREATE TRIGGER deployment_usage_updated
  BEFORE UPDATE ON deployment_usage
  FOR EACH ROW EXECUTE FUNCTION update_deployment_usage_timestamp();

-- Also calculate total on insert
DROP TRIGGER IF EXISTS deployment_usage_inserted ON deployment_usage;
CREATE TRIGGER deployment_usage_inserted
  BEFORE INSERT ON deployment_usage
  FOR EACH ROW EXECUTE FUNCTION update_deployment_usage_timestamp();

-- Create view for user's total deployment costs
-- Uses security_invoker to respect RLS on base tables (PostgreSQL 15+)
CREATE OR REPLACE VIEW user_deployment_costs
WITH (security_invoker = on) AS
SELECT
  da.user_id,
  du.deployed_app_id,
  da.project_id,
  da.platform,
  DATE_TRUNC('month', du.period_start) as month,
  SUM(du.db_reads) as total_db_reads,
  SUM(du.db_writes) as total_db_writes,
  SUM(du.db_storage_bytes) as total_db_storage_bytes,
  SUM(du.requests) as total_requests,
  SUM(du.bandwidth_bytes) as total_bandwidth_bytes,
  SUM(du.compute_ms) as total_compute_ms,
  SUM(du.database_cost_cents) as total_database_cost_cents,
  SUM(du.hosting_cost_cents) as total_hosting_cost_cents,
  SUM(du.total_cost_cents) as total_cost_cents
FROM deployment_usage du
JOIN deployed_apps da ON da.id = du.deployed_app_id
GROUP BY da.user_id, du.deployed_app_id, da.project_id, da.platform, DATE_TRUNC('month', du.period_start);

-- Add comments
COMMENT ON TABLE deployment_usage IS 'Per-deployment resource usage tracking for database and hosting';
COMMENT ON COLUMN deployment_usage.db_reads IS 'Number of database read operations';
COMMENT ON COLUMN deployment_usage.db_writes IS 'Number of database write operations';
COMMENT ON COLUMN deployment_usage.db_storage_bytes IS 'Database storage used in bytes';
COMMENT ON COLUMN deployment_usage.requests IS 'Number of HTTP requests served';
COMMENT ON COLUMN deployment_usage.bandwidth_bytes IS 'Bandwidth used in bytes';
COMMENT ON COLUMN deployment_usage.compute_ms IS 'Edge compute time in milliseconds';
