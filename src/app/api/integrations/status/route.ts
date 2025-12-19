/**
 * GET /api/integrations/status
 * Get user's connected integrations
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

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
      console.error('Failed to fetch integrations:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch integrations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      integrations: (integrations || []).map((i) => ({
        id: i.id,
        provider: i.provider,
        accountId: i.account_id,
        accountName: i.account_name,
        connectedAt: i.created_at,
      })),
    });
  } catch (error) {
    console.error('Integrations status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}
