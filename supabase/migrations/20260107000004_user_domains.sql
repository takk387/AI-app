-- Migration: Create user_domains table
-- Purpose: Track custom domain registrations and assignments to deployed apps

-- Create user_domains table
CREATE TABLE IF NOT EXISTS user_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deployed_app_id UUID REFERENCES deployed_apps(id) ON DELETE SET NULL,

  -- Domain info
  domain TEXT NOT NULL UNIQUE,
  registrar TEXT NOT NULL CHECK (registrar IN ('cloudflare', 'external')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'transferring', 'failed')),

  -- Registration dates
  registered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true,

  -- DNS and SSL
  dns_configured BOOLEAN DEFAULT false,
  ssl_status TEXT DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'provisioning', 'active', 'failed')),

  -- DNS records (for external domains)
  dns_records JSONB DEFAULT '[]'::JSONB,

  -- Pricing (for cloudflare domains)
  purchase_price_cents INTEGER,
  renewal_price_cents INTEGER,

  -- Cloudflare-specific
  cloudflare_zone_id TEXT,

  -- Transfer info (for external domains being transferred)
  transfer_auth_code_encrypted BYTEA,
  transfer_status TEXT CHECK (transfer_status IS NULL OR transfer_status IN ('pending', 'in_progress', 'completed', 'failed')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_user_domains_user ON user_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_user_domains_deployed_app ON user_domains(deployed_app_id) WHERE deployed_app_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_domains_status ON user_domains(status);
CREATE INDEX IF NOT EXISTS idx_user_domains_registrar ON user_domains(registrar);
CREATE INDEX IF NOT EXISTS idx_user_domains_expires ON user_domains(expires_at) WHERE expires_at IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE user_domains ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own domains
CREATE POLICY "Users can view own domains" ON user_domains
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own domains" ON user_domains
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own domains" ON user_domains
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own domains" ON user_domains
  FOR DELETE USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_domains_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp on update
DROP TRIGGER IF EXISTS user_domains_updated ON user_domains;
CREATE TRIGGER user_domains_updated
  BEFORE UPDATE ON user_domains
  FOR EACH ROW EXECUTE FUNCTION update_user_domains_timestamp();

-- Add comments for documentation
COMMENT ON TABLE user_domains IS 'Tracks custom domain registrations and assignments for deployed apps';
COMMENT ON COLUMN user_domains.domain IS 'The domain name (e.g., myapp.com)';
COMMENT ON COLUMN user_domains.registrar IS 'Domain registrar: cloudflare (purchased through platform) or external (user brought their own)';
COMMENT ON COLUMN user_domains.status IS 'Domain status: pending, active, expired, transferring, or failed';
COMMENT ON COLUMN user_domains.dns_configured IS 'Whether DNS records have been configured for the deployed app';
COMMENT ON COLUMN user_domains.ssl_status IS 'SSL certificate status: pending, provisioning, active, or failed';
COMMENT ON COLUMN user_domains.dns_records IS 'DNS records to configure for external domains (CNAME, A, etc.)';
COMMENT ON COLUMN user_domains.cloudflare_zone_id IS 'Cloudflare zone ID for domains managed through Cloudflare';
COMMENT ON COLUMN user_domains.transfer_auth_code_encrypted IS 'Encrypted auth code for domain transfers';
