/**
 * DELETE /api/integrations/vercel/disconnect
 * Disconnect Vercel integration
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function DELETE() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the integration
    const { error: deleteError } = await supabase
      .from('user_integrations')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'vercel');

    if (deleteError) {
      console.error('Failed to delete integration:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to disconnect Vercel' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect Vercel' },
      { status: 500 }
    );
  }
}
