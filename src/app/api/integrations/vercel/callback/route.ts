/**
 * GET /api/integrations/vercel/callback
 * Handle Vercel OAuth callback
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { encrypt } from '@/services/TokenEncryption';
import { OAuthCallbackSchema } from '@/types/deployment';

interface VercelTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
}

interface VercelUserResponse {
  user?: {
    id: string;
    username?: string;
    name?: string;
    email?: string;
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  const cookieStore = await cookies();
  const storedState = cookieStore.get('vercel_oauth_state')?.value;

  // Clear the state cookie
  cookieStore.delete('vercel_oauth_state');

  // Get base URL for redirects
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Handle OAuth errors
  if (error) {
    console.error('Vercel OAuth error:', error, errorDescription);
    return NextResponse.redirect(new URL(`/?error=vercel_oauth_${error}`, baseUrl));
  }

  // Validate state to prevent CSRF
  if (!state || state !== storedState) {
    console.error('OAuth state mismatch');
    return NextResponse.redirect(new URL('/?error=vercel_oauth_invalid_state', baseUrl));
  }

  // Validate params
  const parseResult = OAuthCallbackSchema.safeParse({ code, state });
  if (!parseResult.success || !code) {
    return NextResponse.redirect(new URL('/?error=vercel_oauth_invalid_params', baseUrl));
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
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      throw new Error('Failed to exchange code for token');
    }

    const tokens: VercelTokenResponse = await tokenResponse.json();

    // Get user info from Vercel
    const userResponse = await fetch('https://api.vercel.com/v2/user', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch Vercel user');
      throw new Error('Failed to fetch Vercel user info');
    }

    const vercelUser: VercelUserResponse = await userResponse.json();

    // Get authenticated Supabase user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(new URL('/?error=not_authenticated', baseUrl));
    }

    // Encrypt tokens
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

    // Calculate token expiry
    const tokenExpiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Upsert integration
    const { error: dbError } = await supabase.from('user_integrations').upsert(
      {
        user_id: user.id,
        provider: 'vercel',
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt,
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
      return NextResponse.redirect(new URL('/?error=vercel_save_failed', baseUrl));
    }

    // Redirect back with success
    return NextResponse.redirect(new URL('/?vercel_connected=true', baseUrl));
  } catch (err) {
    console.error('Vercel OAuth error:', err);
    return NextResponse.redirect(new URL('/?error=vercel_oauth_failed', baseUrl));
  }
}
