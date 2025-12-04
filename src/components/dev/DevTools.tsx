'use client';

/**
 * DevTools - Combined development tools component
 *
 * Aggregates all development/debugging tools in one component:
 * - MockAIBanner: Visual warning when mock AI is enabled
 * - DebugPanel: Floating debug overlay
 * - StateInspector: Exposes state to window.__APP_STATE__
 *
 * Only active in development mode.
 */

import React from 'react';
import { MockAIBanner } from './MockAIBanner';
import { DebugPanel } from './DebugPanel';
import { useStateInspector } from '@/hooks/useStateInspector';
import { DEBUG } from '@/utils/debug';

export function DevTools(): React.ReactElement | null {
  // Initialize state inspector (exposes state to window.__APP_STATE__)
  useStateInspector();

  // Don't render anything in production
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* Mock AI warning banner - shows at top of page when mock mode enabled */}
      <MockAIBanner />

      {/* Debug Panel - floating overlay with state/API/token info */}
      <DebugPanel />
    </>
  );
}

export default DevTools;
