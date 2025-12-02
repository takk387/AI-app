# Supabase Authentication Setup - SQL Script

**Run this in Supabase Dashboard → SQL Editor**

This script is safe to run multiple times - it checks if things exist before creating them.

```sql
-- ============================================================================
-- STEP 1: Create user_profiles table (if it doesn't exist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================================
-- STEP 2: Enable Row Level Security
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Drop existing policies (in case they exist)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- ============================================================================
-- STEP 4: Create RLS policies
-- ============================================================================

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STEP 5: Create or replace trigger function for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- STEP 6: Drop existing trigger (if it exists) and recreate
-- ============================================================================

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 7: Create or replace auto-profile-creation function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 8: Drop existing trigger (if it exists) and recreate
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- VERIFICATION: Check if everything was created successfully
-- ============================================================================

SELECT 
  'user_profiles table exists: ' || 
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'user_profiles'
  )::text as status;

SELECT 
  'RLS enabled: ' || 
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_profiles')::text 
  as status;

SELECT 
  'Policies count: ' || 
  COUNT(*)::text 
FROM pg_policies 
WHERE tablename = 'user_profiles';
```

## After Running the SQL

You should see output like:
```
status: user_profiles table exists: true
status: RLS enabled: true
status: Policies count: 3
```

## Next Steps

1. **Configure URL settings** (if not already done):
   - Go to Authentication → URL Configuration
   - Add redirect URL: `http://localhost:3000/api/auth/callback`

2. **Disable email confirmation for testing** (optional):
   - Go to Authentication → Providers → Email
   - Toggle OFF "Confirm email"

3. **Test authentication**:
   ```bash
   npm run dev
   ```
   Then go to `http://localhost:3000` and try signing up!

## Troubleshooting

If you still get errors:
- **"relation already exists"**: The script handles this - ignore if everything works
- **"permission denied"**: Make sure you're running as the project owner in Supabase Dashboard
- **Policies not working**: Try dropping and recreating the table (⚠️ deletes data)
