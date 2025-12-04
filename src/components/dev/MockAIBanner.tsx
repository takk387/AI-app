'use client';

/**
 * MockAIBanner - Visual warning when Mock AI Mode is active
 *
 * Displays a prominent yellow banner at the top of the screen when
 * NEXT_PUBLIC_MOCK_AI=true, so developers know AI responses are fake.
 *
 * Only renders in development mode when mock AI is enabled.
 */

import React from 'react';
import { DEBUG } from '@/utils/debug';

export function MockAIBanner(): React.ReactElement | null {
  // Only show in development with mock AI enabled
  if (!DEBUG.MOCK_AI) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] bg-yellow-400 text-yellow-900 text-center py-1.5 px-4 text-sm font-medium shadow-md">
      <span className="mr-2">⚠️</span>
      <span>MOCK AI MODE - Responses are fake placeholders</span>
      <span className="mx-2">|</span>
      <span className="opacity-75">
        Disable with: <code className="bg-yellow-500/30 px-1 rounded">NEXT_PUBLIC_MOCK_AI=false</code>
      </span>
    </div>
  );
}

export default MockAIBanner;
