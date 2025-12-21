-- Railway Projects Table
-- Tracks Railway project mappings to enable project reuse per app

CREATE TABLE IF NOT EXISTS railway_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  app_id TEXT NOT NULL,                    -- GeneratedComponent.id
  railway_project_id TEXT NOT NULL,        -- Railway's project ID
  railway_service_id TEXT NOT NULL,        -- Railway's service ID
  railway_environment_id TEXT NOT NULL,    -- Railway's environment ID
  preview_url TEXT,                        -- Cached preview URL
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, app_id)
);

-- Index for fast lookups by user and app
CREATE INDEX IF NOT EXISTS idx_railway_projects_user_app ON railway_projects(user_id, app_id);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_railway_projects_created_at ON railway_projects(created_at);

-- Enable Row Level Security
ALTER TABLE railway_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own railway projects"
  ON railway_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own railway projects"
  ON railway_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own railway projects"
  ON railway_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own railway projects"
  ON railway_projects FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_railway_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_railway_projects_updated_at ON railway_projects;
CREATE TRIGGER trigger_railway_projects_updated_at
  BEFORE UPDATE ON railway_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_railway_projects_updated_at();
