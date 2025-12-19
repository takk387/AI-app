/**
 * GET /api/integrations/vercel/authorize
 * Start Vercel OAuth flow
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const clientId = process.env.VERCEL_CLIENT_ID;
  const redirectUri = process.env.VERCEL_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { success: false, error: 'Vercel integration not configured' },
      { status: 500 }
    );
  }

  // Verify user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.redirect(new URL('/login?redirect=/api/integrations/vercel/authorize'));
  }

  // Generate CSRF state token
  const state = nanoid(32);

  // Store state in cookie (httpOnly for security)
  const cookieStore = await cookies();
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
