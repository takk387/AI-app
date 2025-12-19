/**
 * POST /api/apps/[id]/share - Enable sharing, generate slug
 * DELETE /api/apps/[id]/share - Disable sharing
 */

import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

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
      .eq('id', id)
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
      .eq('id', id);

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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // First verify the app exists and user owns it
    const { data: app, error: fetchError } = await supabase
      .from('generated_apps')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !app) {
      return NextResponse.json({ success: false, error: 'App not found' }, { status: 404 });
    }

    if (app.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to modify this app' },
        { status: 403 }
      );
    }

    // Disable sharing
    const { error: updateError } = await supabase
      .from('generated_apps')
      .update({
        is_public: false,
        preview_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

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
