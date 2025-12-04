import { NextRequest, NextResponse } from 'next/server';
import { applyDiff } from '@/utils/applyDiff';

export async function POST(request: NextRequest) {
  try {
    const { currentFiles, diffs } = await request.json();

    if (!currentFiles || !diffs) {
      return NextResponse.json(
        {
          error: 'Missing required parameters: currentFiles and diffs',
        },
        { status: 400 }
      );
    }

    // Apply diffs server-side (where tree-sitter can run)
    const result = await applyDiff(currentFiles, diffs);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error applying diff:', error);
    return NextResponse.json(
      {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to apply diff'],
        modifiedFiles: [],
      },
      { status: 500 }
    );
  }
}
