-- Migration: Create deployed_apps table
-- Purpose: Track deployed applications across all platforms (web, mobile, desktop)

-- Create deployed_apps table
CREATE TABLE IF NOT EXISTS deployed_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES project_documentation(id) ON DELETE CASCADE,

  -- Deployment info
  platform TEXT NOT NULL CHECK (platform IN ('web', 'ios', 'android', 'windows', 'macos', 'linux')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deploying', 'active', 'failed', 'stopped', 'deleted')),
  deployment_url TEXT,
  custom_domain TEXT,

  -- Database (web deployments)
  database_provider TEXT CHECK (database_provider IN ('turso', 'neon', 'byo')),
  database_id TEXT,
  database_url_encrypted BYTEA,

  -- Hosting (web deployments)
  hosting_provider TEXT CHECK (hosting_provider IN ('cloudflare', 'vercel')),
  hosting_project_id TEXT,

  -- Build (mobile/desktop deployments)
  build_id TEXT,
  build_status TEXT CHECK (build_status IS NULL OR build_status IN ('pending', 'queued', 'building', 'completed', 'failed', 'canceled')),
  artifact_url TEXT,

  -- Version tracking
  version TEXT,

  -- Metadata
  config JSONB DEFAULT '{}'::JSONB,
  environment_vars_encrypted BYTEA,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_deployed_at TIMESTAMPTZ,

  -- Unique constraint: one deployment per project per platform
  UNIQUE(project_id, platform)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_deployed_apps_user ON deployed_apps(user_id);
CREATE INDEX IF NOT EXISTS idx_deployed_apps_project ON deployed_apps(project_id);
CREATE INDEX IF NOT EXISTS idx_deployed_apps_platform ON deployed_apps(platform);
CREATE INDEX IF NOT EXISTS idx_deployed_apps_status ON deployed_apps(status);
CREATE INDEX IF NOT EXISTS idx_deployed_apps_hosting ON deployed_apps(hosting_provider) WHERE hosting_provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deployed_apps_database ON deployed_apps(database_provider) WHERE database_provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deployed_apps_last_deployed ON deployed_apps(last_deployed_at DESC NULLS LAST);

-- Enable Row Level Security
ALTER TABLE deployed_apps ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own deployments
CREATE POLICY "Users can view own deployments" ON deployed_apps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deployments" ON deployed_apps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deployments" ON deployed_apps
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own deployments" ON deployed_apps
  FOR DELETE USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_deployed_apps_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp on update
DROP TRIGGER IF EXISTS deployed_apps_updated ON deployed_apps;
CREATE TRIGGER deployed_apps_updated
  BEFORE UPDATE ON deployed_apps
  FOR EACH ROW EXECUTE FUNCTION update_deployed_apps_timestamp();

-- Add comments for documentation
COMMENT ON TABLE deployed_apps IS 'Tracks deployed applications across web, mobile, and desktop platforms';
COMMENT ON COLUMN deployed_apps.platform IS 'Deployment platform: web, ios, android, windows, macos, linux';
COMMENT ON COLUMN deployed_apps.status IS 'Current deployment status';
COMMENT ON COLUMN deployed_apps.database_provider IS 'Database provider for web deployments: turso, neon, or byo (bring your own)';
COMMENT ON COLUMN deployed_apps.hosting_provider IS 'Hosting provider for web deployments: cloudflare or vercel';
COMMENT ON COLUMN deployed_apps.database_url_encrypted IS 'Encrypted database connection URL';
COMMENT ON COLUMN deployed_apps.environment_vars_encrypted IS 'Encrypted environment variables';
COMMENT ON COLUMN deployed_apps.config IS 'Platform-specific configuration (build options, app metadata, etc.)';
