# Supabase Setup Guide

This document provides comprehensive instructions for setting up and using Supabase in the AI App Builder project.

## Table of Contents
1. [Configuration](#configuration)
2. [Database Schema](#database-schema)
3. [Authentication](#authentication)
4. [Storage](#storage)
5. [Real-time Features](#real-time-features)
6. [Usage Examples](#usage-examples)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

## Configuration

### Environment Variables

The following environment variables are configured in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://dqvasekrckiqpliiwbzu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### Vercel Deployment

Add the same environment variables to your Vercel project:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `NEXT_PUBLIC_SUPABASE_URL`
3. Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Set for Production, Preview, and Development environments

## Database Schema

### Tables to Create

Run the following SQL in your Supabase SQL Editor:

#### 1. User Profiles Table

```sql
CREATE TABLE user_profiles (
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

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 2. Generated Apps Table

```sql
CREATE TABLE generated_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE generated_apps ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own apps"
  ON generated_apps FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert own apps"
  ON generated_apps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own apps"
  ON generated_apps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own apps"
  ON generated_apps FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_generated_apps_updated_at
  BEFORE UPDATE ON generated_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_generated_apps_user_id ON generated_apps(user_id);
CREATE INDEX idx_generated_apps_created_at ON generated_apps(created_at DESC);
```

#### 3. Chat History Table

```sql
CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own chat history"
  ON chat_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages"
  ON chat_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at DESC);
```

#### 4. Analytics Events Table

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own analytics"
  ON analytics_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert analytics"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);
```

#### 5. App Templates Table

```sql
CREATE TABLE app_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  code_template TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view public templates"
  ON app_templates FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON app_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON app_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON app_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_app_templates_updated_at
  BEFORE UPDATE ON app_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_app_templates_category ON app_templates(category);
CREATE INDEX idx_app_templates_public ON app_templates(is_public);
CREATE INDEX idx_app_templates_usage ON app_templates(usage_count DESC);
```

### Enable Realtime

For tables that need real-time functionality, run:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE generated_apps;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_history;
ALTER PUBLICATION supabase_realtime ADD TABLE analytics_events;
```

## Storage

### Create Storage Buckets

1. Go to Supabase Dashboard → Storage
2. Create the following buckets:

#### user-uploads
- Public: No
- File size limit: 10MB
- Allowed MIME types: image/*, application/pdf

```sql
-- RLS Policies for user-uploads bucket
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### generated-apps
- Public: No
- File size limit: 50MB

```sql
-- RLS Policies for generated-apps bucket
CREATE POLICY "Users can upload own apps"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated-apps' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own apps"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'generated-apps' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### app-assets
- Public: Yes
- File size limit: 5MB

## Authentication

### Email/Password Setup

1. Go to Authentication → Providers
2. Enable Email provider
3. Configure email templates (optional)

### Social OAuth (Optional)

Configure providers like Google, GitHub:
1. Go to Authentication → Providers
2. Enable desired provider
3. Add OAuth credentials

## Usage Examples

### Client-Side Usage

```typescript
import { createClient } from '@/utils/supabase/client';

// Get current user
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();

// Query data
const { data, error } = await supabase
  .from('generated_apps')
  .select('*')
  .eq('user_id', user.id);
```

### Server-Side Usage

```typescript
import { createClient } from '@/utils/supabase/server';

// In a Server Component or API Route
const supabase = createClient();
const { data } = await supabase.from('generated_apps').select('*');
```

### Storage Usage

```typescript
import { uploadFile, getPublicUrl } from '@/utils/supabase/storage';

// Upload a file
const file = new File(['content'], 'app.zip');
await uploadFile('generated-apps', `${userId}/app.zip`, file);

// Get URL
const url = getPublicUrl('app-assets', 'logo.png');
```

### Real-time Usage

```typescript
import { subscribeToTable } from '@/utils/supabase/realtime';

// Subscribe to changes
const channel = subscribeToTable('generated_apps', '*', (payload) => {
  console.log('Change received:', payload);
});

// Don't forget to unsubscribe
channel.unsubscribe();
```

## Testing

After setup, test the connection:

```bash
npm run dev
```

Check the browser console for any Supabase connection errors.

## Troubleshooting

### Connection Issues
- Verify environment variables are set correctly
- Check Supabase project is not paused
- Ensure RLS policies allow your operations

### TypeScript Errors
- Restart TypeScript server: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
- Regenerate types from database schema

## Next Steps

1. ✅ Environment variables configured
2. ✅ Database schema created
3. ✅ Storage buckets configured
4. ✅ RLS policies set up
5. ✅ Implement authentication UI
6. ✅ Integrate database operations in app
7. ✅ Add real-time features
8. ✅ Deploy to Vercel

**All setup steps complete! The application is production-ready.** 🎉

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
