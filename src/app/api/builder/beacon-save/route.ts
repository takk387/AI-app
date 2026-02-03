/**
 * Beacon Save API Endpoint
 *
 * This endpoint handles save requests from the navigator.sendBeacon() API,
 * which is used to reliably save data when the user is leaving the page
 * (beforeunload event).
 *
 * sendBeacon requests are always POST and the body is sent as text/plain
 * or application/x-www-form-urlencoded, so we need to parse it manually.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { GeneratedComponent } from '@/types/aiBuilderTypes';

// Initialize Supabase client with service role for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Convert a GeneratedComponent to database format
 */
function componentToDbFormat(component: GeneratedComponent, userId: string) {
  return {
    id: component.id,
    user_id: userId,
    title: component.name,
    description: component.description,
    code: component.code,
    metadata: {
      isFavorite: component.isFavorite,
      conversationHistory: component.conversationHistory,
      versions: component.versions || [],
      timestamp: component.timestamp,
      stagePlan: component.stagePlan || null,
      dynamicPhasePlan: component.dynamicPhasePlan || null,
      implementationPlan: component.implementationPlan || null,
      branches: component.branches || [],
      activeBranchId: component.activeBranchId,
      appConcept: component.appConcept || null,
      layoutManifest: component.layoutManifest || null,
      layoutThumbnail: component.layoutThumbnail || null,
      buildStatus: component.buildStatus || 'planning',
    },
    is_public: component.isPublic ?? false,
    preview_slug: component.previewSlug || null,
    preview_enabled: component.previewEnabled ?? true,
    version: (component.versions?.length || 0) + 1,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Validate Supabase configuration
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[beacon-save] Supabase not configured');
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Parse the request body (sendBeacon sends as text)
    let body: { component: GeneratedComponent; userId: string };

    try {
      const text = await request.text();
      body = JSON.parse(text);
    } catch {
      console.error('[beacon-save] Failed to parse request body');
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { component, userId } = body;

    // Validate required fields
    if (!component || !userId) {
      console.error('[beacon-save] Missing component or userId');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!component.id) {
      console.error('[beacon-save] Component missing id');
      return NextResponse.json({ error: 'Component missing id' }, { status: 400 });
    }

    // Create Supabase client with service role
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Convert to database format
    const dbData = componentToDbFormat(component, userId);

    // Upsert to database
    // Cast metadata to unknown first to satisfy TypeScript's Json type requirements
    const { error: dbError } = await supabase.from('generated_apps').upsert({
      ...dbData,
      metadata:
        dbData.metadata as unknown as Database['public']['Tables']['generated_apps']['Row']['metadata'],
    });

    if (dbError) {
      console.error('[beacon-save] Database error:', dbError);
      return NextResponse.json({ error: 'Failed to save to database' }, { status: 500 });
    }

    console.log('[beacon-save] Successfully saved component:', component.id);

    // Return success (though sendBeacon doesn't wait for response)
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[beacon-save] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Allow OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
