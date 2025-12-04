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
import { ElementInspector } from './ElementInspector';
import { useStateInspector } from '@/hooks/useStateInspector';
import { SHOW_DEV_TOOLS } from '@/utils/debug';

export function DevTools(): React.ReactElement | null {
  // Initialize state inspector (exposes state to window.__APP_STATE__)
  useStateInspector();

  // Don't render if dev tools are disabled
  // Enable via: NEXT_PUBLIC_DEV_TOOLS=true (or automatically in development mode)
  if (!SHOW_DEV_TOOLS) {
    return null;
  }

  return (
    <>
      {/* Mock AI warning banner - shows at top of page when mock mode enabled */}
      <MockAIBanner />

      {/* Debug Panel - floating overlay with state/API/token info */}
      <DebugPanel />

      {/* Element Inspector - visual element selection and Claude prompt generation */}
      <ElementInspector />
    </>
  );
}

export default DevTools;
