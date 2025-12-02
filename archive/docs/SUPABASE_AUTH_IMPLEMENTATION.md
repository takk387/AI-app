# Supabase Authentication Implementation Plan

## Current State Analysis

### What We Have
✅ **Supabase Infrastructure**
- Environment variables configured in `.env.local`
- Supabase client utilities (`src/utils/supabase/client.ts`, `src/utils/supabase/server.ts`)
- Middleware already configured for Supabase sessions (`src/middleware.ts`)
- TypeScript types defined (`src/types/supabase.ts`)

❌ **Current Auth System**
- Simple password-based authentication (checks against `SITE_PASSWORD` env var)
- Uses cookies for session management (`site-auth` cookie)
- No user accounts or database integration
- Login page at `/login` but only checks a single password

### What Needs to Change

## Implementation Plan

### Phase 1: Database Setup (Supabase Dashboard)
**MUST BE DONE FIRST IN SUPABASE DASHBOARD**

1. **Enable Email Authentication**
   - Go to Supabase Dashboard → Authentication → Providers
   - Enable "Email" provider
   - Configure email templates (optional)
   - Set site URL and redirect URLs

2. **Create user_profiles Table**
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

3. **Create Profile on Signup (Trigger)**
   ```sql
   -- Function to create profile on signup
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

   -- Trigger on auth.users
   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW
     EXECUTE FUNCTION public.handle_new_user();
   ```

### Phase 2: Auth Context & Hooks

**File: `src/contexts/AuthContext.tsx`** (NEW)
```typescript
"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshSession = async () => {
    const { data } = await supabase.auth.getSession();
    setUser(data.session?.user ?? null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Phase 3: Update Login Page

**File: `src/app/login/page.tsx`** (UPDATE)
- Add email input field
- Add "Sign Up" toggle/link
- Use Supabase auth instead of simple password
- Handle email confirmation flow
- Show loading states properly

### Phase 4: Create Signup Page

**File: `src/app/signup/page.tsx`** (NEW)
- Email, password, confirm password fields
- Optional: Full name field
- Form validation
- Handle email confirmation message
- Link back to login

### Phase 5: Update AuthGuard

**File: `src/components/AuthGuard.tsx`** (UPDATE)
- Use Supabase session instead of cookie check
- Use AuthContext for user state
- Handle loading states properly
- Redirect to /login if not authenticated

### Phase 6: API Routes

**File: `src/app/api/auth/signup/route.ts`** (NEW)
- Server-side signup endpoint (optional, can be done client-side)

**File: `src/app/api/auth/signout/route.ts`** (NEW)
- Server-side signout endpoint

**File: `src/app/api/auth/callback/route.ts`** (NEW)
- Handle email confirmation callbacks

**File: `src/app/api/auth/login/route.ts`** (UPDATE OR DELETE)
- Either update to use Supabase or delete (not needed if client-side)

**File: `src/app/api/auth/check/route.ts`** (UPDATE)
- Check Supabase session instead of cookie

### Phase 7: Update Root Layout

**File: `src/app/layout.tsx`** (UPDATE)
- Wrap app with AuthProvider
- Keep or remove AuthGuard based on needs

### Phase 8: Add User Profile UI

**File: `src/components/UserMenu.tsx`** (NEW)
- Show user email/avatar
- Dropdown with "Profile", "Settings", "Sign Out"
- Add to AIBuilder header

### Phase 9: Testing Checklist

- [ ] Sign up with new email
- [ ] Receive confirmation email
- [ ] Confirm email and login
- [ ] Session persists on page refresh
- [ ] Sign out works
- [ ] Protected routes redirect to login
- [ ] Middleware handles auth correctly
- [ ] Multiple tabs sync auth state

## Implementation Order

1. **Database Setup** (Supabase Dashboard) ⚠️ CRITICAL FIRST STEP
2. Create AuthContext (`src/contexts/AuthContext.tsx`)
3. Update root layout to include AuthProvider
4. Update login page with email/password
5. Create signup page
6. Update AuthGuard to use Supabase
7. Create auth callback route
8. Add user menu to AIBuilder
9. Test complete flow

## Important Notes

### Middleware Already Configured
The `src/middleware.ts` is already set up for Supabase:
- Refreshes session on every request
- Handles cookies properly
- No changes needed

### Environment Variables
Already configured in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://dqvasekrckiqpliiwbzu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

### Email Confirmation Flow
By default, Supabase requires email confirmation:
- User signs up → receives confirmation email
- Clicks link → redirected to callback route
- Callback route confirms email → redirects to app

Can be disabled in Supabase Dashboard → Authentication → Settings → Email Auth → "Enable email confirmations" (toggle off for development)

### Migration Path
Current users using simple password:
- No migration needed (different auth systems)
- Can run both in parallel temporarily
- Eventually remove `SITE_PASSWORD` and old auth routes

## Security Considerations

1. **Row Level Security (RLS)**: Enabled on all tables - users can only access their own data
2. **HTTPS**: Required in production for secure cookies
3. **Password Requirements**: Configure in Supabase Dashboard → Authentication → Settings
4. **Rate Limiting**: Built into Supabase auth
5. **Session Duration**: Configure in Supabase settings (default 1 week)

## Next Steps After Implementation

1. Add password reset flow
2. Add email change flow  
3. Add profile editing
4. Add OAuth providers (Google, GitHub, etc.)
5. Add user settings page
6. Integrate user_id with generated_apps table
