# Supabase Quick Start Guide

This is a condensed guide to get you started with Supabase in the AI App Builder immediately.

## Prerequisites

✅ Supabase project credentials configured in `.env.local`
✅ Required packages installed (@supabase/ssr)
✅ Client utilities created

## Step 1: Create Database Tables (5 minutes)

1. Go to your Supabase Dashboard: https://dqvasekrckiqpliiwbzu.supabase.co
2. Click **SQL Editor** in the sidebar
3. Copy and paste the SQL from `docs/SUPABASE_SETUP.md` section "Database Schema"
4. Execute each table creation script one by one

**Quick All-in-One Script:**

```sql
-- Run this to create all tables at once
-- (Copy from SUPABASE_SETUP.md for full version with RLS policies)
```

## Step 2: Create Storage Buckets (2 minutes)

1. Go to **Storage** in Supabase Dashboard
2. Click **New bucket**
3. Create three buckets:
   - `user-uploads` (Private)
   - `generated-apps` (Private)
   - `app-assets` (Public)

## Step 3: Enable Authentication (1 minute)

1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. (Optional) Enable social providers (Google, GitHub, etc.)

## Step 4: Configure Vercel Environment Variables

Add these to your Vercel project:

```
NEXT_PUBLIC_SUPABASE_URL=https://dqvasekrckiqpliiwbzu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Ready to Use!

### Client Components

```typescript
'use client';
import { createClient } from '@/utils/supabase/client';

export default function MyComponent() {
  const supabase = createClient();
  
  // Sign up
  const { data, error } = await supabase.auth.signUp({
    email: 'user@example.com',
    password: 'password123',
  });
  
  // Query data
  const { data: apps } = await supabase
    .from('generated_apps')
    .select('*');
    
  return <div>{/* Your UI */}</div>;
}
```

### Server Components & API Routes

```typescript
import { createClient } from '@/utils/supabase/server';

export default async function ServerComponent() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  const { data: apps } = await supabase
    .from('generated_apps')
    .select('*');
    
  return <div>{/* Your UI */}</div>;
}
```

### Storage Operations

```typescript
import { uploadFile, downloadFile } from '@/utils/supabase/storage';

// Upload
const file = new File(['content'], 'example.txt');
await uploadFile('user-uploads', `${userId}/example.txt`, file);

// Download
const blob = await downloadFile('user-uploads', `${userId}/example.txt`);
```

### Real-time Subscriptions

```typescript
'use client';
import { subscribeToTable } from '@/utils/supabase/realtime';
import { useEffect } from 'react';

export default function RealtimeComponent() {
  useEffect(() => {
    const channel = subscribeToTable('generated_apps', 'INSERT', (payload) => {
      console.log('New app created:', payload.new);
    });
    
    return () => {
      channel.unsubscribe();
    };
  }, []);
  
  return <div>{/* Your UI */}</div>;
}
```

## Common Operations

### Save Generated App

```typescript
const { data, error } = await supabase
  .from('generated_apps')
  .insert({
    user_id: user.id,
    title: 'My App',
    code: '<div>Hello World</div>',
    metadata: { framework: 'React' }
  });
```

### Save Chat History

```typescript
const { data, error } = await supabase
  .from('chat_history')
  .insert({
    user_id: user.id,
    session_id: 'session-123',
    role: 'user',
    content: 'Create a todo app',
  });
```

### Track Analytics Event

```typescript
const { data, error } = await supabase
  .from('analytics_events')
  .insert({
    user_id: user?.id,
    event_type: 'app_generated',
    event_data: { 
      duration: 5000,
      success: true 
    }
  });
```

### Load User's Apps

```typescript
const { data: apps, error } = await supabase
  .from('generated_apps')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });
```

## File Structure

```
src/
├── utils/supabase/
│   ├── client.ts          # Browser client
│   ├── server.ts          # Server client
│   ├── storage.ts         # Storage utilities
│   └── realtime.ts        # Real-time utilities
├── types/
│   └── supabase.ts        # Database types
├── middleware.ts          # Auth middleware
└── .env.local            # Environment variables
```

## Testing Your Setup

Run the development server:

```bash
npm run dev
```

Open browser console and test:

```javascript
// In browser console
const { createClient } = await import('/utils/supabase/client');
const supabase = createClient();
const { data, error } = await supabase.auth.getSession();
console.log('Session:', data);
```

## Next Steps

1. ✅ Create database tables in Supabase
2. ✅ Create storage buckets
3. ✅ Enable authentication
4. ✅ Add environment variables to Vercel
5. ⏳ Implement authentication UI in your app
6. ⏳ Start using database operations
7. ⏳ Add real-time features
8. ⏳ Deploy to Vercel

## Need More Help?

See `docs/SUPABASE_SETUP.md` for detailed documentation including:
- Complete SQL scripts with RLS policies
- Storage bucket configuration
- Advanced usage examples
- Troubleshooting guide

## Key Features Available

✅ **Authentication**: Email/password, social OAuth
✅ **Database**: PostgreSQL with Row Level Security
✅ **Storage**: File uploads with access control
✅ **Real-time**: Live subscriptions and presence
✅ **TypeScript**: Full type safety
✅ **Middleware**: Automatic session refresh

Start building! 🚀
