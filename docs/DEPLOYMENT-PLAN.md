# User Deployment Features - Implementation Plan

## Implementation Status

| Phase       | Feature                 | Status       |
| ----------- | ----------------------- | ------------ |
| **Phase 1** | Instant Preview URLs    | **COMPLETE** |
| **Phase 2** | One-Click Vercel Deploy | **COMPLETE** |

**Last Updated:** 2025-12-19

---

## Summary

Implement **Phase 1 + Phase 2**:

1. **Phase 1:** Instant Preview URLs - shareable links like `/preview/abc123` **[COMPLETE]**
2. **Phase 2:** One-Click Deploy to Vercel - OAuth-based deployment **[COMPLETE]**

**Scope:** Phase 1 + Phase 2 (Phase 3 mobile deployment deferred)

---

## What Already Exists

| Component              | Status       | Location                                                   |
| ---------------------- | ------------ | ---------------------------------------------------------- |
| Share button UI        | **Complete** | `src/components/ProjectDropdown.tsx` (wired to ShareModal) |
| ShareModal             | **Complete** | `src/components/modals/ShareModal.tsx`                     |
| Preview page           | **Complete** | `src/app/preview/[slug]/page.tsx`                          |
| Preview API            | **Complete** | `src/app/api/preview/[slug]/route.ts`                      |
| Share API              | **Complete** | `src/app/api/apps/[id]/share/route.ts`                     |
| Deployment types       | **Complete** | `src/types/deployment.ts`                                  |
| Supabase types         | **Complete** | `src/types/supabase.ts` (incl. user_integrations)          |
| Database sync          | **Complete** | `src/hooks/useDatabaseSync.ts` (preview fields handled)    |
| Deployment modal       | **Complete** | `src/components/modals/DeploymentModal.tsx` (with Vercel)  |
| Export functionality   | **Complete** | `src/utils/exportApp.ts`                                   |
| Token encryption       | **Complete** | `src/services/TokenEncryption.ts`                          |
| Deployment service     | **Complete** | `src/services/DeploymentService.ts`                        |
| useDeployment hook     | **Complete** | `src/hooks/useDeployment.ts`                               |
| Vercel OAuth authorize | **Complete** | `src/app/api/integrations/vercel/authorize/route.ts`       |
| Vercel OAuth callback  | **Complete** | `src/app/api/integrations/vercel/callback/route.ts`        |
| Vercel disconnect      | **Complete** | `src/app/api/integrations/vercel/disconnect/route.ts`      |
| Integration status API | **Complete** | `src/app/api/integrations/status/route.ts`                 |
| Vercel deploy API      | **Complete** | `src/app/api/deploy/vercel/route.ts`                       |

> **Note:** Database migrations have been applied to Supabase for both Phase 1 and Phase 2.

---

## Best Practices Applied

| Practice           | Implementation                                                |
| ------------------ | ------------------------------------------------------------- |
| **Zod validation** | All API routes use Zod schemas                                |
| **CORS headers**   | Preview API supports embedding                                |
| **Error format**   | `{ success: false, error: string }` consistently              |
| **FK references**  | Use `user_profiles(user_id)` not `auth.users(id)`             |
| **Type exports**   | Row/Insert/Update types for all tables                        |
| **Hook pattern**   | Follow `useDatabaseSync` with `isLoading`, `error`, callbacks |
| **Types file**     | New `src/types/deployment.ts` for deployment types            |

---

# PHASE 1: Instant Preview URLs [COMPLETE]

## Step 1: Database Migration [COMPLETE]

**Run in Supabase SQL Editor:** _(Already executed)_

```sql
-- Add preview fields to generated_apps
ALTER TABLE generated_apps
  ADD COLUMN IF NOT EXISTS preview_slug VARCHAR(12) UNIQUE,
  ADD COLUMN IF NOT EXISTS preview_enabled BOOLEAN DEFAULT true;

-- Index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_preview_slug
  ON generated_apps(preview_slug) WHERE preview_slug IS NOT NULL;

-- RLS policy: anyone can view public apps (no auth required)
CREATE POLICY "Public preview access" ON generated_apps
  FOR SELECT USING (is_public = true AND preview_enabled = true);
```

## Step 2: Install Dependencies [COMPLETE]

```bash
npm install nanoid
```

## Step 3: Create Types [COMPLETE]

**Create:** `src/types/deployment.ts`

```typescript
import { z } from 'zod';

// ============ SHARE TYPES ============

export interface ShareState {
  isPublic: boolean;
  previewSlug: string | null;
  previewUrl: string | null;
  previewEnabled: boolean;
}

export interface ShareResponse {
  success: boolean;
  previewUrl?: string;
  previewSlug?: string;
  error?: string;
}

// Zod Schemas
export const ShareToggleSchema = z.object({
  appId: z.string().uuid(),
});

export const PreviewSlugSchema = z.object({
  slug: z.string().min(8).max(16),
});

// ============ DEPLOYMENT TYPES (Phase 2) ============

export type DeploymentPlatform = 'vercel' | 'netlify';
export type DeploymentStatus = 'pending' | 'building' | 'ready' | 'error' | 'canceled';

export interface DeploymentResult {
  success: boolean;
  deploymentId?: string;
  url?: string;
  status?: DeploymentStatus;
  error?: string;
}

export interface VercelAccount {
  id: string;
  name: string;
  email?: string;
  connectedAt: string;
}

export interface UserIntegration {
  id: string;
  provider: DeploymentPlatform;
  accountId: string | null;
  accountName: string | null;
  connectedAt: string;
}

// Zod Schemas for Phase 2
export const DeployRequestSchema = z.object({
  appId: z.string().uuid(),
  projectName: z.string().min(1).max(100).optional(),
});

export const OAuthCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});
```

## Step 4: Update Supabase Types [COMPLETE]

**Modify:** `src/types/supabase.ts`

Add to `generated_apps` table interface:

```typescript
// In Row:
preview_slug: string | null;
preview_enabled: boolean;

// In Insert:
preview_slug?: string | null;
preview_enabled?: boolean;

// In Update:
preview_slug?: string | null;
preview_enabled?: boolean;
```

## Step 5: Create Preview API Route [COMPLETE]

**Create:** `src/app/api/preview/[slug]/route.ts`

```typescript
/**
 * GET /api/preview/[slug]
 * Fetch public app data for preview - no auth required
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PreviewSlugSchema } from '@/types/deployment';

// CORS headers for potential iframe embedding
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  try {
    // Validate slug format
    const parseResult = PreviewSlugSchema.safeParse({ slug: params.slug });
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid preview slug' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Use service role client for public access (bypasses RLS for this query)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: app, error } = await supabase
      .from('generated_apps')
      .select('id, title, description, code, metadata, created_at')
      .eq('preview_slug', params.slug)
      .eq('is_public', true)
      .eq('preview_enabled', true)
      .single();

    if (error || !app) {
      return NextResponse.json(
        { success: false, error: 'Preview not found or not public' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        app: {
          id: app.id,
          title: app.title,
          description: app.description,
          code: app.code,
          createdAt: app.created_at,
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Preview fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch preview' },
      { status: 500, headers: corsHeaders }
    );
  }
}
```

## Step 6: Create Share API Route [COMPLETE]

**Create:** `src/app/api/apps/[id]/share/route.ts`

```typescript
/**
 * POST /api/apps/[id]/share - Enable sharing, generate slug
 * DELETE /api/apps/[id]/share - Disable sharing
 */

import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this app
    const { data: app, error: fetchError } = await supabase
      .from('generated_apps')
      .select('id, user_id, preview_slug')
      .eq('id', params.id)
      .single();

    if (fetchError || !app) {
      return NextResponse.json({ success: false, error: 'App not found' }, { status: 404 });
    }

    if (app.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to share this app' },
        { status: 403 }
      );
    }

    // Generate slug if doesn't exist, otherwise reuse
    const previewSlug = app.preview_slug || nanoid(12);

    // Update app to be public with slug
    const { error: updateError } = await supabase
      .from('generated_apps')
      .update({
        is_public: true,
        preview_slug: previewSlug,
        preview_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Share update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to enable sharing' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const previewUrl = `${baseUrl}/preview/${previewSlug}`;

    return NextResponse.json({
      success: true,
      previewUrl,
      previewSlug,
    });
  } catch (error) {
    console.error('Share error:', error);
    return NextResponse.json({ success: false, error: 'Failed to share app' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership and disable sharing
    const { error: updateError } = await supabase
      .from('generated_apps')
      .update({
        is_public: false,
        preview_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to disable sharing' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unshare error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disable sharing' },
      { status: 500 }
    );
  }
}
```

## Step 7: Create Preview Page [COMPLETE]

**Create:** `src/app/preview/[slug]/layout.tsx`

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'App Preview - AI App Builder',
  description: 'Preview a generated application',
  robots: 'noindex', // Don't index preview pages
};

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950">
        {children}
      </body>
    </html>
  );
}
```

**Create:** `src/app/preview/[slug]/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import PreviewBanner from '@/components/preview/PreviewBanner';

// Dynamic import to avoid SSR issues with Sandpack
const PowerfulPreview = dynamic(
  () => import('@/components/PowerfulPreview'),
  { ssr: false, loading: () => <PreviewLoading /> }
);

function PreviewLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4" />
        <p className="text-gray-400">Loading preview...</p>
      </div>
    </div>
  );
}

interface PreviewApp {
  id: string;
  title: string;
  description: string | null;
  code: string;
  createdAt: string;
}

export default function PreviewPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [app, setApp] = useState<PreviewApp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPreview() {
      try {
        const response = await fetch(`/api/preview/${slug}`);
        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Preview not found');
          return;
        }

        setApp(data.app);
      } catch (err) {
        setError('Failed to load preview');
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchPreview();
    }
  }, [slug]);

  if (loading) {
    return <PreviewLoading />;
  }

  if (error || !app) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Preview Not Found</h1>
          <p className="text-gray-400">{error || 'This preview is not available'}</p>
          <a
            href="/"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to AI App Builder
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Preview Content */}
      <div className="flex-1">
        <PowerfulPreview
          code={app.code}
          title={app.title}
          isPreviewMode={true}
        />
      </div>

      {/* Branding Banner */}
      <PreviewBanner appTitle={app.title} />
    </div>
  );
}
```

## Step 8: Create PreviewBanner Component [COMPLETE]

**Create:** `src/components/preview/PreviewBanner.tsx`

```typescript
'use client';

interface PreviewBannerProps {
  appTitle: string;
}

export default function PreviewBanner({ appTitle }: PreviewBannerProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 py-2 px-4 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="font-medium text-white">{appTitle}</span>
          <span>-</span>
          <span>Built with AI App Builder</span>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Create your own app
        </a>
      </div>
    </div>
  );
}
```

## Step 9: Create ShareModal Component [COMPLETE]

**Create:** `src/components/modals/ShareModal.tsx`

```typescript
'use client';

import { useState, useCallback } from 'react';
import { X, Link2, Check, Copy, Globe, Lock } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  appId: string;
  appTitle: string;
  initialShareState?: {
    isPublic: boolean;
    previewSlug: string | null;
  };
}

export default function ShareModal({
  isOpen,
  onClose,
  appId,
  appTitle,
  initialShareState,
}: ShareModalProps) {
  const [isPublic, setIsPublic] = useState(initialShareState?.isPublic ?? false);
  const [previewSlug, setPreviewSlug] = useState(initialShareState?.previewSlug);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = previewSlug
    ? `${window.location.origin}/preview/${previewSlug}`
    : null;

  const handleToggleShare = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isPublic) {
        // Disable sharing
        const response = await fetch(`/api/apps/${appId}/share`, {
          method: 'DELETE',
        });
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error);
        }

        setIsPublic(false);
      } else {
        // Enable sharing
        const response = await fetch(`/api/apps/${appId}/share`, {
          method: 'POST',
        });
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error);
        }

        setIsPublic(true);
        setPreviewSlug(data.previewSlug);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sharing');
    } finally {
      setIsLoading(false);
    }
  }, [appId, isPublic]);

  const handleCopyLink = useCallback(async () => {
    if (!previewUrl) return;

    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy link');
    }
  }, [previewUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Share App</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* App Title */}
          <div className="text-sm text-gray-400">
            Sharing <span className="text-white font-medium">{appTitle}</span>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="text-green-400" size={20} />
              ) : (
                <Lock className="text-gray-400" size={20} />
              )}
              <div>
                <div className="text-white font-medium">
                  {isPublic ? 'Public' : 'Private'}
                </div>
                <div className="text-xs text-gray-400">
                  {isPublic
                    ? 'Anyone with the link can view'
                    : 'Only you can access'}
                </div>
              </div>
            </div>
            <button
              onClick={handleToggleShare}
              disabled={isLoading}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isPublic ? 'bg-green-600' : 'bg-gray-600'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  isPublic ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Share Link */}
          {isPublic && previewUrl && (
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Share Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={previewUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Step 10: Update Middleware [COMPLETE]

**Modify:** `src/middleware.ts`

```typescript
// Update the matcher to exclude preview routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|preview|api/preview|api/ai-builder|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

## Step 11: Wire Up in AIBuilder [COMPLETE]

**Modify:** `src/components/AIBuilder.tsx`

Add state and handler:

```typescript
// Add import
import ShareModal from '@/components/modals/ShareModal';

// Add state
const [showShareModal, setShowShareModal] = useState(false);

// Add to JSX (near other modals)
{showShareModal && currentComponent && (
  <ShareModal
    isOpen={showShareModal}
    onClose={() => setShowShareModal(false)}
    appId={currentComponent.id}
    appTitle={currentComponent.name}
    initialShareState={{
      isPublic: false, // Get from component metadata if stored
      previewSlug: null,
    }}
  />
)}

// Connect to ProjectDropdown's onShare prop
<ProjectDropdown onShare={() => setShowShareModal(true)} />
```

## Step 12: Update useDatabaseSync [COMPLETE]

**Modify:** `src/hooks/useDatabaseSync.ts`

Add preview fields to conversion functions:

```typescript
// In componentToDb():
preview_slug: component.previewSlug || null,
preview_enabled: component.previewEnabled ?? true,

// In dbToComponent():
previewSlug: dbApp.preview_slug || null,
previewEnabled: dbApp.preview_enabled ?? true,
```

---

# PHASE 2: One-Click Deploy to Vercel

## Prerequisites (Manual Steps)

### 1. Create Vercel OAuth App

1. Go to https://vercel.com/account/integrations
2. Create new OAuth app
3. Set redirect URI: `https://yourapp.com/api/integrations/vercel/callback`
4. Copy Client ID and Client Secret

### 2. Add Environment Variables

```bash
VERCEL_CLIENT_ID=your_client_id
VERCEL_CLIENT_SECRET=your_client_secret
VERCEL_REDIRECT_URI=https://yourapp.com/api/integrations/vercel/callback
TOKEN_ENCRYPTION_KEY=generate_with_openssl_rand_hex_32
```

## Step 13: Database Migration (Phase 2)

**Run in Supabase SQL Editor:**

```sql
-- User integrations table (OAuth tokens)
CREATE TABLE user_integrations (
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

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own integrations" ON user_integrations
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_user_integrations_user ON user_integrations(user_id);
```

## Step 14: Update Supabase Types (Phase 2)

**Modify:** `src/types/supabase.ts`

Add `user_integrations` table:

```typescript
user_integrations: {
  Row: {
    id: string;
    user_id: string;
    provider: string;
    access_token_encrypted: string;
    refresh_token_encrypted: string | null;
    token_expires_at: string | null;
    account_id: string | null;
    account_name: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    provider: string;
    access_token_encrypted: string;
    refresh_token_encrypted?: string | null;
    token_expires_at?: string | null;
    account_id?: string | null;
    account_name?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    provider?: string;
    access_token_encrypted?: string;
    refresh_token_encrypted?: string | null;
    token_expires_at?: string | null;
    account_id?: string | null;
    account_name?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'user_integrations_user_id_fkey';
      columns: ['user_id'];
      referencedRelation: 'user_profiles';
      referencedColumns: ['user_id'];
    },
  ];
};
```

## Step 15: Create TokenEncryption Service

**Create:** `src/services/TokenEncryption.ts`

```typescript
/**
 * TokenEncryption Service
 * AES-256-GCM encryption for OAuth tokens at rest
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is not set');
  }
  // Key should be 32 bytes (64 hex chars)
  return Buffer.from(key, 'hex');
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();

  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }

  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

## Step 16: Create Vercel OAuth Routes

**Create:** `src/app/api/integrations/vercel/authorize/route.ts`

```typescript
/**
 * GET /api/integrations/vercel/authorize
 * Start Vercel OAuth flow
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';

export async function GET() {
  const clientId = process.env.VERCEL_CLIENT_ID;
  const redirectUri = process.env.VERCEL_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { success: false, error: 'Vercel integration not configured' },
      { status: 500 }
    );
  }

  // Generate CSRF state token
  const state = nanoid(32);

  // Store state in cookie (httpOnly for security)
  const cookieStore = cookies();
  cookieStore.set('vercel_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  // Build Vercel OAuth URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'user:read deployments:create projects:create',
    response_type: 'code',
    state,
  });

  const authUrl = `https://vercel.com/oauth/authorize?${params}`;

  return NextResponse.redirect(authUrl);
}
```

**Create:** `src/app/api/integrations/vercel/callback/route.ts`

```typescript
/**
 * GET /api/integrations/vercel/callback
 * Handle Vercel OAuth callback
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { encrypt } from '@/services/TokenEncryption';
import { OAuthCallbackSchema } from '@/types/deployment';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const cookieStore = cookies();
  const storedState = cookieStore.get('vercel_oauth_state')?.value;

  // Clear the state cookie
  cookieStore.delete('vercel_oauth_state');

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(new URL(`/?error=vercel_oauth_${error}`, request.url));
  }

  // Validate state to prevent CSRF
  if (!state || state !== storedState) {
    return NextResponse.redirect(new URL('/?error=vercel_oauth_invalid_state', request.url));
  }

  // Validate params
  const parseResult = OAuthCallbackSchema.safeParse({ code, state });
  if (!parseResult.success || !code) {
    return NextResponse.redirect(new URL('/?error=vercel_oauth_invalid_params', request.url));
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://api.vercel.com/v2/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.VERCEL_CLIENT_ID!,
        client_secret: process.env.VERCEL_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.VERCEL_REDIRECT_URI!,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokens = await tokenResponse.json();

    // Get user info from Vercel
    const userResponse = await fetch('https://api.vercel.com/v2/user', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const vercelUser = await userResponse.json();

    // Get authenticated Supabase user
    const supabase = createClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(new URL('/?error=not_authenticated', request.url));
    }

    // Encrypt tokens
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

    // Upsert integration
    const { error: dbError } = await supabase.from('user_integrations').upsert(
      {
        user_id: user.id,
        provider: 'vercel',
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        account_id: vercelUser.user?.id || null,
        account_name: vercelUser.user?.username || vercelUser.user?.name || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,provider',
      }
    );

    if (dbError) {
      console.error('Failed to save integration:', dbError);
      return NextResponse.redirect(new URL('/?error=vercel_save_failed', request.url));
    }

    // Redirect back with success
    return NextResponse.redirect(new URL('/?vercel_connected=true', request.url));
  } catch (err) {
    console.error('Vercel OAuth error:', err);
    return NextResponse.redirect(new URL('/?error=vercel_oauth_failed', request.url));
  }
}
```

## Step 17: Create Integration Status Route

**Create:** `src/app/api/integrations/status/route.ts`

```typescript
/**
 * GET /api/integrations/status
 * Get user's connected integrations
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: integrations, error } = await supabase
      .from('user_integrations')
      .select('id, provider, account_id, account_name, created_at')
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch integrations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      integrations: integrations.map((i) => ({
        id: i.id,
        provider: i.provider,
        accountId: i.account_id,
        accountName: i.account_name,
        connectedAt: i.created_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}
```

## Step 18: Create DeploymentService

**Create:** `src/services/DeploymentService.ts`

```typescript
/**
 * DeploymentService
 * Handles Vercel deployment via API
 */

import { createClient } from '@/utils/supabase/server';
import { decrypt } from './TokenEncryption';
import type { DeploymentResult, DeploymentStatus } from '@/types/deployment';

export class DeploymentService {
  /**
   * Get decrypted Vercel token for a user
   */
  static async getVercelToken(
    supabase: ReturnType<typeof createClient>,
    userId: string
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('access_token_encrypted')
      .eq('user_id', userId)
      .eq('provider', 'vercel')
      .single();

    if (error || !data) return null;

    try {
      return decrypt(data.access_token_encrypted);
    } catch {
      return null;
    }
  }

  /**
   * Deploy app to Vercel
   */
  static async deployToVercel(params: {
    token: string;
    projectName: string;
    files: Record<string, string>;
  }): Promise<DeploymentResult> {
    const { token, projectName, files } = params;

    try {
      // Create deployment using Vercel API
      const response = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          files: Object.entries(files).map(([path, content]) => ({
            file: path,
            data: Buffer.from(content).toString('base64'),
            encoding: 'base64',
          })),
          projectSettings: {
            framework: 'nextjs',
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error?.message || 'Deployment failed',
        };
      }

      const deployment = await response.json();

      return {
        success: true,
        deploymentId: deployment.id,
        url: `https://${deployment.url}`,
        status: deployment.readyState as DeploymentStatus,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create deployment',
      };
    }
  }

  /**
   * Check deployment status
   */
  static async getDeploymentStatus(
    token: string,
    deploymentId: string
  ): Promise<{ status: DeploymentStatus; url?: string }> {
    const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return { status: 'error' };
    }

    const deployment = await response.json();

    return {
      status: deployment.readyState as DeploymentStatus,
      url: deployment.url ? `https://${deployment.url}` : undefined,
    };
  }
}
```

## Step 19: Create Deploy API Route

**Create:** `src/app/api/deploy/vercel/route.ts`

```typescript
/**
 * POST /api/deploy/vercel
 * Deploy app to Vercel
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { DeploymentService } from '@/services/DeploymentService';
import { DeployRequestSchema } from '@/types/deployment';
import { generatePackageJson, generateReadme } from '@/utils/exportApp';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request
    const parseResult = DeployRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }

    const { appId, projectName } = parseResult.data;

    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get app data
    const { data: app, error: appError } = await supabase
      .from('generated_apps')
      .select('*')
      .eq('id', appId)
      .eq('user_id', user.id)
      .single();

    if (appError || !app) {
      return NextResponse.json({ success: false, error: 'App not found' }, { status: 404 });
    }

    // Get Vercel token
    const token = await DeploymentService.getVercelToken(supabase, user.id);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Vercel not connected' }, { status: 400 });
    }

    // Prepare files for deployment
    const files: Record<string, string> = {
      'src/App.tsx': app.code,
      'package.json': generatePackageJson(app.title),
      'README.md': generateReadme(app.title, app.description || ''),
      // Add other necessary files...
    };

    // Deploy
    const result = await DeploymentService.deployToVercel({
      token,
      projectName: projectName || app.title.toLowerCase().replace(/\s+/g, '-'),
      files,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Deploy error:', error);
    return NextResponse.json({ success: false, error: 'Deployment failed' }, { status: 500 });
  }
}
```

## Step 20: Create useDeployment Hook

**Create:** `src/hooks/useDeployment.ts`

```typescript
/**
 * useDeployment Hook
 * Manages deployment state and operations
 */

import { useState, useCallback, useEffect } from 'react';
import type { UserIntegration, DeploymentResult, DeploymentStatus } from '@/types/deployment';

export interface UseDeploymentOptions {
  onError?: (error: string) => void;
  onSuccess?: (url: string) => void;
}

export interface UseDeploymentReturn {
  // Connection state
  isVercelConnected: boolean;
  vercelAccount: { name: string; id: string } | null;
  integrations: UserIntegration[];
  isLoadingIntegrations: boolean;

  // Actions
  connectVercel: () => void;
  disconnectVercel: () => Promise<void>;
  refreshIntegrations: () => Promise<void>;

  // Deployment
  deployToVercel: (appId: string, projectName?: string) => Promise<DeploymentResult>;
  deploymentStatus: DeploymentStatus | null;
  deploymentUrl: string | null;
  isDeploying: boolean;
  error: string | null;
  clearError: () => void;
}

export function useDeployment(options?: UseDeploymentOptions): UseDeploymentReturn {
  const { onError, onSuccess } = options || {};

  const [integrations, setIntegrations] = useState<UserIntegration[]>([]);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Fetch integrations on mount
  const refreshIntegrations = useCallback(async () => {
    setIsLoadingIntegrations(true);
    try {
      const response = await fetch('/api/integrations/status');
      const data = await response.json();

      if (data.success) {
        setIntegrations(data.integrations);
      }
    } catch {
      // Silent fail - user may not be logged in
    } finally {
      setIsLoadingIntegrations(false);
    }
  }, []);

  useEffect(() => {
    refreshIntegrations();
  }, [refreshIntegrations]);

  // Derived state
  const vercelIntegration = integrations.find((i) => i.provider === 'vercel');
  const isVercelConnected = !!vercelIntegration;
  const vercelAccount = vercelIntegration
    ? { name: vercelIntegration.accountName || 'Unknown', id: vercelIntegration.accountId || '' }
    : null;

  // Connect to Vercel (redirect to OAuth)
  const connectVercel = useCallback(() => {
    window.location.href = '/api/integrations/vercel/authorize';
  }, []);

  // Disconnect Vercel
  const disconnectVercel = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations/vercel/disconnect', {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      await refreshIntegrations();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect';
      setError(message);
      onError?.(message);
    }
  }, [refreshIntegrations, onError]);

  // Deploy to Vercel
  const deployToVercel = useCallback(
    async (appId: string, projectName?: string): Promise<DeploymentResult> => {
      setIsDeploying(true);
      setError(null);
      setDeploymentStatus('pending');

      try {
        const response = await fetch('/api/deploy/vercel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appId, projectName }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error);
        }

        setDeploymentStatus(result.status);
        setDeploymentUrl(result.url);
        onSuccess?.(result.url);

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Deployment failed';
        setError(message);
        setDeploymentStatus('error');
        onError?.(message);
        return { success: false, error: message };
      } finally {
        setIsDeploying(false);
      }
    },
    [onError, onSuccess]
  );

  return {
    isVercelConnected,
    vercelAccount,
    integrations,
    isLoadingIntegrations,
    connectVercel,
    disconnectVercel,
    refreshIntegrations,
    deployToVercel,
    deploymentStatus,
    deploymentUrl,
    isDeploying,
    error,
    clearError,
  };
}
```

## Step 21: Update DeploymentModal

**Modify:** `src/components/modals/DeploymentModal.tsx`

Add Vercel connection and deploy UI (integrate with existing modal).

---

# Complete File Summary

## Files to Create (14 files)

| File                                                 | Phase | Status   | Purpose                              |
| ---------------------------------------------------- | ----- | -------- | ------------------------------------ |
| `src/types/deployment.ts`                            | 1+2   | **Done** | All deployment types and Zod schemas |
| `src/app/preview/[slug]/page.tsx`                    | 1     | **Done** | Public preview page                  |
| `src/app/preview/[slug]/layout.tsx`                  | 1     | **Done** | Minimal preview layout               |
| `src/app/api/preview/[slug]/route.ts`                | 1     | **Done** | GET public app data                  |
| `src/app/api/apps/[id]/share/route.ts`               | 1     | **Done** | POST/DELETE share toggle             |
| `src/components/modals/ShareModal.tsx`               | 1     | **Done** | Share UI with toggle + copy          |
| `src/components/preview/PreviewBanner.tsx`           | 1     | **Done** | "Built with AI App Builder" footer   |
| `src/services/TokenEncryption.ts`                    | 2     | Pending  | AES-256-GCM token encryption         |
| `src/services/DeploymentService.ts`                  | 2     | Pending  | Vercel API integration               |
| `src/hooks/useDeployment.ts`                         | 2     | Pending  | Deployment state management          |
| `src/app/api/integrations/vercel/authorize/route.ts` | 2     | Pending  | Start OAuth                          |
| `src/app/api/integrations/vercel/callback/route.ts`  | 2     | Pending  | OAuth callback                       |
| `src/app/api/integrations/status/route.ts`           | 2     | Pending  | Check connections                    |
| `src/app/api/deploy/vercel/route.ts`                 | 2     | Pending  | Deploy to Vercel                     |

## Files to Modify (5 files)

| File                                        | Phase | Status        | Changes                                          |
| ------------------------------------------- | ----- | ------------- | ------------------------------------------------ |
| `src/types/supabase.ts`                     | 1+2   | **Done** (P1) | Add preview fields + user_integrations table     |
| `src/middleware.ts`                         | 1     | **Done**      | Allow /preview/_ and /api/preview/_ without auth |
| `src/components/AIBuilder.tsx`              | 1     | **Done**      | Add share button + ShareModal                    |
| `src/hooks/useDatabaseSync.ts`              | 1     | **Done**      | Handle preview_slug, preview_enabled             |
| `src/components/modals/DeploymentModal.tsx` | 2     | Pending       | Add Vercel OAuth + deploy UI                     |

## Additional Files Modified (Phase 1)

| File                          | Changes                                      |
| ----------------------------- | -------------------------------------------- |
| `src/types/aiBuilderTypes.ts` | Added `previewSlug`, `previewEnabled` fields |
| `src/store/useAppStore.ts`    | Added `showShareModal` state                 |

---

## SQL Migrations (Run Manually)

### Migration 1: Preview URLs

```sql
ALTER TABLE generated_apps
  ADD COLUMN IF NOT EXISTS preview_slug VARCHAR(12) UNIQUE,
  ADD COLUMN IF NOT EXISTS preview_enabled BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_preview_slug
  ON generated_apps(preview_slug) WHERE preview_slug IS NOT NULL;

CREATE POLICY "Public preview access" ON generated_apps
  FOR SELECT USING (is_public = true AND preview_enabled = true);
```

### Migration 2: User Integrations

```sql
CREATE TABLE user_integrations (
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

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own integrations" ON user_integrations
  FOR ALL USING (auth.uid() = user_id);
```

---

## Dependencies [INSTALLED]

```bash
npm install nanoid  # Already installed
```

---

## Estimated Effort

| Phase                  | Effort           |
| ---------------------- | ---------------- |
| Phase 1: Preview URLs  | ~4-6 hours       |
| Phase 2: Vercel Deploy | ~6-8 hours       |
| **Total**              | **~10-14 hours** |

---

## User Journeys

### Sharing (2 clicks)

1. User clicks "Share" button
2. Toggles "Make Public" and copies link
3. Anyone can view at `/preview/abc123`

### Deploying to Web (3 clicks)

1. User clicks "Deploy"
2. Connects Vercel (one-time OAuth)
3. Clicks "Deploy Now" and gets live URL

---

## Security Checklist

### Phase 1 (Preview URLs)

- [x] RLS ensures only public apps accessible via preview
- [x] Validate user owns app before sharing
- [x] No secrets in client-side code

### Phase 2 (Vercel Deploy)

- [ ] CSRF protection in OAuth flow (state param)
- [ ] Encrypt tokens at rest (AES-256-GCM)
- [ ] Validate user owns app before deploying

---

## Notes

- Preview uses `FullAppPreview.tsx` Sandpack component (updated from original plan)
- Existing `is_public` field finally gets used
- ZIP export remains as fallback option
- Can add Netlify later with same pattern
- **Phase 1 uses `nanoid` for generating 12-character preview slugs**
