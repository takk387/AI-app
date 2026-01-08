-- Migration: Create user_subscriptions table
-- Purpose: Manage user subscription tiers, limits, and Stripe billing

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Subscription tier
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'pro', 'business', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),

  -- Deployment limits
  max_deployed_apps INTEGER NOT NULL DEFAULT 0,
  max_custom_domains INTEGER NOT NULL DEFAULT 0,

  -- Usage limits (free tier default is 0, upgraded tiers get their tier's limit)
  spend_limit_cents INTEGER NOT NULL DEFAULT 0,

  -- Stripe integration
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,

  -- Billing period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  canceled_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_subs_tier ON user_subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_user_subs_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subs_stripe_customer ON user_subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_subs_period_end ON user_subscriptions(current_period_end);

-- Enable Row Level Security
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own subscription
CREATE POLICY "Users can view own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only insert their own subscription (service role bypasses RLS)
CREATE POLICY "Users can insert own subscription" ON user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_subscriptions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS user_subscriptions_updated ON user_subscriptions;
CREATE TRIGGER user_subscriptions_updated
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_user_subscriptions_timestamp();

-- Function to create default subscription for new users
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, tier, status, max_deployed_apps, max_custom_domains)
  VALUES (NEW.id, 'free', 'active', 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create subscription when user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_subscription();

-- Define tier limits as a reference (application enforces these)
COMMENT ON TABLE user_subscriptions IS 'User subscription tiers with deployment limits and Stripe billing';
COMMENT ON COLUMN user_subscriptions.tier IS 'Subscription tier: free (0 deploys), starter (3 deploys), pro (10 deploys), business (25 deploys), enterprise (unlimited)';
COMMENT ON COLUMN user_subscriptions.spend_limit_cents IS 'Monthly spend limit for managed API services in cents';
COMMENT ON COLUMN user_subscriptions.max_deployed_apps IS 'Maximum number of active deployed apps allowed';
COMMENT ON COLUMN user_subscriptions.max_custom_domains IS 'Maximum number of custom domains allowed';
