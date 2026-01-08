/**
 * POST /api/proxy/storage/upload
 *
 * Upload files to Cloudflare R2 using platform or user storage.
 * Tracks usage and calculates costs for platform storage.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getStorageProxyService } from '@/services/api-gateway';

// ============================================================================
// CONSTANTS
// ============================================================================

// Maximum file size: 100MB (used by StorageProxyService for validation)
const _MAX_FILE_SIZE = 100 * 1024 * 1024;

// ============================================================================
// ROUTE HANDLER
// ============================================================================

/**
 * POST - Upload file
 */
export async function POST(request: Request) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const appId = formData.get('appId') as string | null;
    const folder = formData.get('folder') as string | null;
    const isPublic = formData.get('isPublic') === 'true';
    const usePlatformStorage = formData.get('usePlatformStorage') !== 'false';

    // Validate required fields
    if (!file) {
      return NextResponse.json({ success: false, error: 'File is required' }, { status: 400 });
    }

    if (!appId) {
      return NextResponse.json({ success: false, error: 'App ID is required' }, { status: 400 });
    }

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify app belongs to user
    const { data: app, error: appError } = await supabase
      .from('deployed_apps')
      .select('id')
      .eq('id', appId)
      .eq('user_id', user.id)
      .single();

    if (appError || !app) {
      return NextResponse.json({ success: false, error: 'Invalid app ID' }, { status: 400 });
    }

    // Get storage service
    const storageService = getStorageProxyService();

    // Validate request
    const uploadRequest = {
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
      folder: folder || undefined,
      isPublic,
    };

    const validation = storageService.validateRequest(uploadRequest);
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    // Upload file
    const result = await storageService.proxy(
      { ...uploadRequest, file },
      {
        userId: user.id,
        appId,
        service: 'storage',
        endpoint: '/storage/upload',
        isPlatformKey: usePlatformStorage,
      }
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: result.data?.url,
      key: result.data?.key,
      size: result.data?.size,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Storage upload error:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload file' }, { status: 500 });
  }
}

/**
 * Configure route segment
 */
export const runtime = 'nodejs';

// Disable body parser to handle multipart form data manually
export const dynamic = 'force-dynamic';
