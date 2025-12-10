# User Deployment Features - Implementation Plan

> Save this for when you're ready to implement. No rush!

## Overview

Three features to let users share and deploy their generated apps with zero friction:

1. **Instant Preview URLs** - Shareable links like `/preview/abc123`
2. **One-Click Deploy to Vercel** - OAuth-based web deployment
3. **One-Click Deploy to Mobile App Stores** - Publish to Google Play and Apple App Store

---

## Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Preview persistence | Permanent | Users share portfolio pieces, links shouldn't break |
| Deploy platform | Vercel first | Best Next.js support, simplest for users |
| Preview rendering | Client-side Sandpack | Zero infrastructure cost, reuses existing code |
| Share UX | One-click toggle | No configuration needed |

---

## Phase 1: Instant Preview URLs

### Database Migration (Run in Supabase SQL Editor)

```sql
-- Add preview fields to generated_apps
ALTER TABLE generated_apps
  ADD COLUMN IF NOT EXISTS preview_slug VARCHAR(12) UNIQUE,
  ADD COLUMN IF NOT EXISTS preview_enabled BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_preview_slug
  ON generated_apps(preview_slug) WHERE preview_slug IS NOT NULL;

-- RLS policy: anyone can view public apps
CREATE POLICY "Public preview access" ON generated_apps
  FOR SELECT USING (is_public = true AND preview_enabled = true);
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/preview/[slug]/page.tsx` | Public preview page |
| `src/app/preview/[slug]/layout.tsx` | Minimal layout for previews |
| `src/app/api/preview/[slug]/route.ts` | GET public app data |
| `src/app/api/apps/[id]/share/route.ts` | POST to share, DELETE to unshare |
| `src/components/modals/ShareModal.tsx` | Toggle public, copy link |
| `src/components/preview/PreviewBanner.tsx` | "Built with AI App Builder" footer |

### Files to Modify

| File | Changes |
|------|---------|
| `src/types/supabase.ts` | Add `preview_slug`, `preview_enabled` |
| `src/hooks/useDatabaseSync.ts` | Handle new fields |
| `src/components/AIBuilder.tsx` | Add Share button |
| `src/components/modals/LibraryModal.tsx` | Add share icon to cards |
| `src/middleware.ts` | Allow `/preview/*` without auth |

### Implementation Steps

1. Run SQL migration in Supabase
2. Update TypeScript types
3. Create `/api/preview/[slug]` route
4. Create `/api/apps/[id]/share` route
5. Create preview page + layout
6. Create ShareModal component
7. Add share buttons to UI
8. Test end-to-end

---

## Phase 2: One-Click Deploy to Vercel

### Prerequisites

1. Create Vercel OAuth app at https://vercel.com/account/integrations
2. Get `VERCEL_CLIENT_ID` and `VERCEL_CLIENT_SECRET`

### Environment Variables

```bash
VERCEL_CLIENT_ID=your_client_id
VERCEL_CLIENT_SECRET=your_client_secret
VERCEL_REDIRECT_URI=https://yourapp.com/api/integrations/vercel/callback
TOKEN_ENCRYPTION_KEY=32_byte_random_key
```

### Database Migration

```sql
CREATE TABLE user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
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

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own integrations" ON user_integrations
  FOR ALL USING (auth.uid() = user_id);
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/services/TokenEncryption.ts` | Encrypt/decrypt OAuth tokens |
| `src/services/DeploymentService.ts` | Prepare files, call Vercel API |
| `src/hooks/useDeployment.ts` | Manage deployment state |
| `src/app/api/integrations/vercel/authorize/route.ts` | Start OAuth |
| `src/app/api/integrations/vercel/callback/route.ts` | Handle callback |
| `src/app/api/integrations/status/route.ts` | Check connection status |
| `src/app/api/deploy/vercel/route.ts` | Deploy app |

### Files to Modify

| File | Changes |
|------|---------|
| `src/types/supabase.ts` | Add `user_integrations` table |
| `src/components/modals/DeploymentModal.tsx` | Add connect + deploy buttons |

### Implementation Steps

1. Create Vercel OAuth app (manual)
2. Add environment variables
3. Run SQL migration
4. Create TokenEncryption service
5. Create OAuth routes
6. Create DeploymentService
7. Create deploy API route
8. Create useDeployment hook
9. Redesign DeploymentModal
10. Test end-to-end

---

## Dependencies to Add

```bash
npm install nanoid
```

---

## User Journeys

### Sharing (2 clicks)
1. User clicks "Share" button
2. Toggles "Make Public" → copies link
3. Anyone can view at `/preview/abc123`

### Deploying to Web (3 clicks)
1. User clicks "Deploy"
2. Connects Vercel (one-time OAuth)
3. Clicks "Deploy Now" → gets live URL

### Deploying to Mobile (5 clicks first time, 2 clicks after)
1. User clicks "Deploy" → selects "Mobile App"
2. Chooses platform (Android/iOS/Both)
3. Configures store credentials (one-time)
4. Reviews app metadata
5. Clicks "Deploy to Store" → monitors progress

---

## Security Checklist

### Web Deployment
- [ ] RLS ensures only public apps accessible via preview
- [ ] Validate user owns app before sharing/deploying
- [ ] CSRF protection in OAuth flow (state param)
- [ ] Encrypt tokens at rest (AES-256-GCM)
- [ ] No secrets in client-side code

### Mobile Deployment
- [ ] Encrypt mobile credentials at rest (AES-256-GCM)
- [ ] Validate user owns app before mobile deployment
- [ ] Secure keystore password handling (never logged)
- [ ] Validate bundle IDs against injection attacks
- [ ] Rate limit mobile builds (expensive operation)
- [ ] Sanitize app metadata before submission
- [ ] Secure webhook endpoints with signature verification

---

## Notes

- Preview uses existing `PowerfulPreview.tsx` Sandpack component
- Existing `is_public` field finally gets used
- ZIP export remains as fallback option
- Can add Netlify later with same pattern

---

## Phase 3: One-Click Deploy to Mobile App Stores

Convert your generated web apps into native mobile applications and publish them directly to the Google Play Store (Android) and Apple App Store (iOS) with minimal friction.

### Overview

This phase uses [Capacitor](https://capacitorjs.com/) to wrap React web applications as native mobile apps. Capacitor allows web apps to run natively on iOS and Android with access to native device features while maintaining a single codebase.

> **Framework Compatibility**: Capacitor works with any web framework (React, Vue, Angular, vanilla JS). Since this app builder generates React applications, all generated apps are fully compatible with Capacitor's mobile deployment pipeline.

### Prerequisites

#### General Requirements
1. A generated app that is ready for deployment
2. App icons and splash screens (can be auto-generated)
3. Valid app metadata (name, description, screenshots)

#### Android (Google Play Store)
1. **Google Play Console Account** ($25 one-time registration fee)
2. **Service Account** with Google Play Developer API access
3. **Signing Keystore** for Android app signing

#### iOS (Apple App Store)
1. **Apple Developer Program Account** ($99/year)
2. **App Store Connect API Key**
3. **Code Signing Certificates** and **Provisioning Profiles**
4. **Xcode Cloud** or **Fastlane** for automated builds (iOS builds require macOS)

### Environment Variables

```bash
# Google Play Store (Android)
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=base64_encoded_service_account_json
ANDROID_KEYSTORE_BASE64=base64_encoded_keystore
ANDROID_KEYSTORE_PASSWORD=your_keystore_password
ANDROID_KEY_ALIAS=your_key_alias
ANDROID_KEY_PASSWORD=your_key_password

# Apple App Store (iOS)
APPLE_API_KEY_ID=your_api_key_id
APPLE_API_ISSUER_ID=your_issuer_id
APPLE_API_KEY_BASE64=base64_encoded_p8_key
APPLE_TEAM_ID=your_team_id
APP_STORE_CONNECT_APP_ID=your_app_id

# Common
MOBILE_BUILD_WEBHOOK_URL=https://yourapp.com/api/mobile/webhook
```

### Database Migration

```sql
-- Add mobile deployment tracking table
CREATE TABLE mobile_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES generated_apps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('android', 'ios')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  version_name VARCHAR(20),
  version_code INTEGER,
  bundle_id VARCHAR(255),
  store_listing_url TEXT,
  build_log TEXT,
  error_message TEXT,
  submitted_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store mobile app credentials per user
CREATE TABLE mobile_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('android', 'ios')),
  credentials_encrypted TEXT NOT NULL,
  account_email VARCHAR(255),
  account_name VARCHAR(100),
  is_configured BOOLEAN DEFAULT false,
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

ALTER TABLE mobile_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mobile deployments" ON mobile_deployments
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own mobile credentials" ON mobile_credentials
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_mobile_deployments_app ON mobile_deployments(app_id);
CREATE INDEX idx_mobile_deployments_user ON mobile_deployments(user_id);
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/services/MobileDeploymentService.ts` | Orchestrate mobile build and deploy |
| `src/services/CapacitorBuildService.ts` | Generate Capacitor project from web app |
| `src/services/AndroidDeployService.ts` | Build APK/AAB and upload to Play Store |
| `src/services/IOSDeployService.ts` | Trigger iOS build and upload to App Store |
| `src/services/MobileAssetGenerator.ts` | Generate app icons and splash screens |
| `src/hooks/useMobileDeployment.ts` | Manage mobile deployment state |
| `src/app/api/mobile/configure/route.ts` | Save mobile credentials |
| `src/app/api/mobile/deploy/android/route.ts` | Deploy to Google Play |
| `src/app/api/mobile/deploy/ios/route.ts` | Deploy to Apple App Store |
| `src/app/api/mobile/status/[id]/route.ts` | Check deployment status |
| `src/app/api/mobile/webhook/route.ts` | Handle build completion webhooks |
| `src/components/modals/MobileDeployModal.tsx` | Mobile deployment wizard UI |
| `src/components/mobile/MobileCredentialsForm.tsx` | Credential setup form |
| `src/components/mobile/DeploymentProgress.tsx` | Real-time deployment status |

### Files to Modify

| File | Changes |
|------|---------|
| `src/types/supabase.ts` | Add `mobile_deployments`, `mobile_credentials` types |
| `src/components/modals/DeploymentModal.tsx` | Add mobile platform options |
| `src/components/AIBuilder.tsx` | Add mobile deploy button |

### Implementation Steps

#### Android Deployment Flow

1. **Configure Credentials** (one-time setup)
   - User uploads Google Play Service Account JSON
   - User provides keystore file and passwords
   - Credentials are encrypted and stored

2. **Prepare App for Mobile**
   - Generate `capacitor.config.ts` with app metadata
   - Create Android project structure
   - Generate app icons (adaptive icons for Android)
   - Generate splash screen assets

3. **Build Android App**
   - Run Capacitor sync to copy web assets
   - Build release AAB (Android App Bundle)
   - Sign the bundle with user's keystore

4. **Upload to Play Store**
   - Use Google Play Developer API
   - Upload AAB to internal testing track
   - Optionally promote to production

#### iOS Deployment Flow

1. **Configure Credentials** (one-time setup)
   - User provides App Store Connect API key
   - User provides Team ID and App ID
   - Credentials are encrypted and stored

2. **Prepare App for Mobile**
   - Generate `capacitor.config.ts` with app metadata
   - Create iOS project structure
   - Generate app icons (all required iOS sizes)
   - Generate launch screen storyboard

3. **Trigger iOS Build**
   - Send build request to cloud build service (e.g., Codemagic, Bitrise, or custom macOS runner)
   - Build IPA with proper code signing
   - Wait for build completion via webhook

4. **Upload to App Store**
   - Use App Store Connect API
   - Upload IPA to TestFlight
   - Submit for review (optional)

### User Journey

#### Mobile Deployment (5 clicks first time, 2 clicks after setup)

**First-time Setup:**
1. User clicks "Deploy" → selects "Mobile App"
2. Chooses platform (Android/iOS/Both)
3. Configures store credentials (one-time)
4. Reviews app metadata (name, bundle ID, version)
5. Clicks "Deploy to Store"

**Subsequent Deployments:**
1. User clicks "Deploy" → selects "Mobile App"
2. Clicks "Deploy to Store" → monitors progress

### Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                         │
│  MobileDeployModal → Platform Selection → Credential Setup  │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  API Routes                                  │
│  /api/mobile/deploy/android    /api/mobile/deploy/ios       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              MobileDeploymentService                         │
│  Orchestrates the entire mobile deployment pipeline          │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
┌─────────────────────┐  ┌─────────────────────┐
│ CapacitorBuildService│  │ MobileAssetGenerator │
│ - Generate config    │  │ - App icons          │
│ - Sync web assets    │  │ - Splash screens     │
│ - Build native apps  │  │ - Store screenshots  │
└─────────┬───────────┘  └─────────────────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
┌────────┐ ┌────────┐
│Android │ │  iOS   │
│Deploy  │ │Deploy  │
│Service │ │Service │
└────┬───┘ └────┬───┘
     │          │
     ▼          ▼
┌────────┐ ┌────────────┐
│ Google │ │ App Store  │
│ Play   │ │ Connect    │
│ API    │ │ API        │
└────────┘ └────────────┘
```

### Dependencies to Add

```bash
npm install @capacitor/core@^6.0.0 @capacitor/cli@^6.0.0 @capacitor/android@^6.0.0 @capacitor/ios@^6.0.0
npm install sharp@^0.33.0  # For image resizing (icons/splash screens)
```

### Important Considerations

#### iOS Build Requirements
- iOS apps **must** be built on macOS with Xcode
- Options for serverless iOS builds:

| Option | Cost | Performance | Best For |
|--------|------|-------------|----------|
| **Codemagic** | Free tier: 500 min/month, $95+/month paid | Fast, ~5-10 min builds | Production apps, teams |
| **Bitrise** | Free tier: limited, $90+/month paid | Fast, ~5-15 min builds | CI/CD focused teams |
| **GitHub Actions (macOS)** | $0.08/min (10x Linux cost) | Variable, ~10-20 min | Open source, occasional builds |
| **Self-hosted Mac mini** | ~$700 one-time + maintenance | Fastest, full control | High volume, cost-sensitive |

#### App Store Guidelines
- Both stores have review processes (1-7 days typically)
- Apps must comply with platform guidelines
- Certain app types may require additional verification

#### Bundle Identifiers
- Android: `com.yourcompany.appname`
- iOS: `com.yourcompany.appname`
- Must be unique across all apps in each store
- Cannot be changed after first submission

**Auto-generation Strategy:**
- System generates unique bundle IDs using: `com.aiappbuilder.{user_id_short}.{app_name_slug}`
- Example: `com.aiappbuilder.u7k3m.my-todo-app`
- Users can customize the bundle ID before first deployment
- Collision detection prevents duplicate bundle IDs across the platform
