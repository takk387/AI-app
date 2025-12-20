# Phase 2: One-Click Vercel Deploy - Setup Guide

## Step 1: Create Vercel Integration

> **Note:** Vercel calls OAuth applications "Integrations"

1. Go to [Vercel Integration Console](https://vercel.com/dashboard/integrations/console)
   - Or: Dashboard → Settings → Integrations → Integration Console

2. Click **"Create Integration"**

3. Fill in the required fields:
   | Field | Value |
   |-------|-------|
   | **Name** | AI App Builder |
   | **Slug** | ai-app-builder (auto-generated) |
   | **Logo** | Upload a 256x256 PNG (required for client credentials) |
   | **Description** | Deploy apps directly from AI App Builder |
   | **Redirect URL** | `http://localhost:3000/api/integrations/vercel/callback` |

4. Under **Permissions**, select these scopes:
   - `user:read` - Get current user info
   - `deployments:create` - Create deployments
   - `projects:create` - Create projects

5. Click **Create** to save

6. Scroll to **Credentials** section at the bottom
   - Copy **Client ID** (starts with `oac_`)
   - Click **Generate Client Secret** and copy immediately (you can't see it again!)

---

## Step 2: Generate Encryption Key

The encryption key secures OAuth tokens at rest in the database.

**Windows (PowerShell):**

```powershell
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
```

**Mac/Linux:**

```bash
openssl rand -hex 32
```

Copy the 64-character hex string output.

---

## Step 3: Add Environment Variables

Add to `.env.local`:

```bash
# Vercel OAuth (from Step 1)
VERCEL_CLIENT_ID=oac_xxxxxxxxxxxxxxxxxxxxxxxx
VERCEL_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VERCEL_REDIRECT_URI=http://localhost:3000/api/integrations/vercel/callback

# Token Encryption (from Step 2 - must be exactly 64 hex characters)
TOKEN_ENCRYPTION_KEY=your_64_character_hex_string_here

# App URL (used for OAuth redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Step 4: Run Database Migration

Go to Supabase Dashboard → **SQL Editor** and run:

```sql
-- Create user_integrations table for storing OAuth tokens
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  account_id VARCHAR(100),
  account_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Enable Row Level Security
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only manage their own integrations
CREATE POLICY "Users manage own integrations" ON user_integrations
  FOR ALL USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_integrations_user
  ON user_integrations(user_id);
```

---

## Step 5: Verify Setup

1. **Restart dev server:**

   ```bash
   npm run dev
   ```

2. **Test OAuth flow:**
   - Open your app at `http://localhost:3000`
   - Open any saved app and click "Deploy"
   - Switch to "One-Click Deploy" tab
   - Click "Connect Vercel"
   - You should be redirected to Vercel's consent page
   - Click "Authorize"
   - You should return to your app with the connection confirmed

3. **Verify in database:**
   - Go to Supabase → Table Editor → `user_integrations`
   - You should see a row with `provider: 'vercel'`

---

## Production Deployment Checklist

| Task                                                                                      | Status |
| ----------------------------------------------------------------------------------------- | ------ |
| Update `VERCEL_REDIRECT_URI` to `https://yourdomain.com/api/integrations/vercel/callback` | ◻️     |
| Update `NEXT_PUBLIC_APP_URL` to `https://yourdomain.com`                                  | ◻️     |
| Add all env vars to your hosting provider (Vercel/Railway/etc)                            | ◻️     |
| Update Redirect URL in Vercel Integration Console to production URL                       | ◻️     |
| Test OAuth flow in production                                                             | ◻️     |
| Verify deployments work end-to-end                                                        | ◻️     |

---

## Troubleshooting

| Error                                | Cause                                               | Solution                                          |
| ------------------------------------ | --------------------------------------------------- | ------------------------------------------------- |
| `Vercel integration not configured`  | Missing `VERCEL_CLIENT_ID` or `VERCEL_REDIRECT_URI` | Add to `.env.local`                               |
| `vercel_not_configured`              | Missing `VERCEL_CLIENT_SECRET`                      | Add to `.env.local`                               |
| `vercel_oauth_invalid_state`         | CSRF mismatch or cookie expired                     | Try again, check cookies enabled                  |
| `Invalid redirect URL`               | Redirect URI doesn't match Vercel config            | Must match **exactly** (including trailing slash) |
| `TOKEN_ENCRYPTION_KEY not set`       | Missing encryption key                              | Generate 64-char hex key                          |
| `Invalid ciphertext format`          | Corrupted stored tokens                             | Delete row in `user_integrations`, reconnect      |
| `Vercel not connected` during deploy | Token missing or expired                            | Disconnect and reconnect Vercel                   |

---

## OAuth Flow Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Your App      │     │     Vercel      │     │   Supabase DB   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ 1. User clicks        │                       │
         │    "Connect Vercel"   │                       │
         │ ─────────────────────>│                       │
         │                       │                       │
         │ 2. Redirect to        │                       │
         │    /oauth/authorize   │                       │
         │ <─────────────────────│                       │
         │                       │                       │
         │ 3. User approves      │                       │
         │                       │                       │
         │ 4. Callback with code │                       │
         │ <─────────────────────│                       │
         │                       │                       │
         │ 5. Exchange code ────>│                       │
         │    for token          │                       │
         │ <──── access_token ───│                       │
         │                       │                       │
         │ 6. Encrypt & store ───────────────────────────>│
         │                       │                       │
         │ 7. Redirect with      │                       │
         │    ?vercel_connected=true                     │
         │                       │                       │
```

---

## Security Notes

1. **Tokens encrypted at rest:** All OAuth tokens are encrypted with AES-256-GCM before storage
2. **CSRF protection:** State parameter prevents cross-site request forgery
3. **HttpOnly cookies:** State stored in httpOnly cookie, not accessible to JavaScript
4. **Row-level security:** Users can only access their own integrations
5. **No secrets in client:** All OAuth operations happen server-side

---

## Sources

- [Vercel Sign in with Vercel](https://vercel.com/docs/integrations/sign-in-with-vercel)
- [Vercel REST API Integrations](https://vercel.com/docs/integrations/vercel-api-integrations)
- [Vercel Integration Console](https://vercel.com/dashboard/integrations/console)
