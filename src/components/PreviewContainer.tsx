'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { RailwayPreview } from './preview/RailwayPreview';
import { BrowserPreview } from './preview/BrowserPreview';
import { PreviewModeSelector } from './preview/PreviewModeSelector';
import type { PreviewMode, AppFile } from '@/types/railway';
import { logger } from '@/utils/logger';

// Component-level logger
const log = logger.child({ route: 'PreviewContainer' });

// Extended AppFile for preview (includes optional description)
interface PreviewAppFile extends AppFile {
  description?: string;
}

interface PreviewContainerProps {
  appDataJson: string;
  appType?: 'FRONTEND_ONLY' | 'FULL_STACK';
  // Pass-through props for preview settings
  isFullscreen?: boolean;
  onCaptureReady?: (captureFunc: () => Promise<string | null>) => void;
  devicePreset?: string | null;
  orientation?: 'portrait' | 'landscape';
  previewWidth?: number;
  previewHeight?: number | 'auto';
  enableTouchSimulation?: boolean;
  showConsole?: boolean;
  onConsoleToggle?: () => void;
  // Mode selector visibility
  showModeSelector?: boolean;
  className?: string;
}

// ============================================================================
// APP TYPE DETECTION
// ============================================================================

/**
 * Detect if app requires backend/full-stack capabilities.
 * Uses precise pattern matching to avoid false positives.
 *
 * IMPORTANT: Be careful not to match common frontend patterns:
 * - Apollo Client, TanStack Query use createClient()
 * - next/server can be used for cookies() in client components
 * - Comments may contain backend-related words
 */
function detectAppType(files: PreviewAppFile[]): 'FRONTEND_ONLY' | 'FULL_STACK' {
  for (const file of files) {
    const pathLower = file.path.toLowerCase();
    const content = file.content;

    // =========================================================================
    // PATH-BASED DETECTION (High confidence)
    // =========================================================================

    // API routes - path must be an API route directory
    // Match: /api/, app/api/, pages/api/
    if (/\/(pages|app)\/api\//.test(pathLower) || pathLower.startsWith('api/')) {
      return 'FULL_STACK';
    }

    // Server files - dedicated server entry points
    if (
      /\bserver\.(js|ts|mjs)$/.test(pathLower) ||
      pathLower.includes('server/index') ||
      pathLower.startsWith('backend/')
    ) {
      return 'FULL_STACK';
    }

    // =========================================================================
    // CONTENT-BASED DETECTION (Precise patterns only)
    // =========================================================================

    // Express/backend frameworks - require import patterns
    if (
      /require\s*\(\s*['"]express['"]\s*\)/.test(content) ||
      /from\s+['"]express['"]/.test(content) ||
      /express\s*\(\s*\)/.test(content) ||
      /http\.createServer/.test(content) ||
      /\.listen\s*\(\s*\d+/.test(content) // .listen(3000) or .listen(PORT)
    ) {
      return 'FULL_STACK';
    }

    // Next.js API route handlers - specific exports
    if (
      /export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(/.test(content) ||
      /NextApiRequest/.test(content) ||
      /NextApiResponse/.test(content)
    ) {
      return 'FULL_STACK';
    }

    // Database and ORM - require actual usage patterns
    // NOTE: @supabase/supabase-js is used for frontend auth/realtime, so it's NOT a backend indicator
    // Only server-side Supabase admin or service role patterns indicate backend
    if (
      /mongoose\.connect\s*\(/.test(content) ||
      /mongoose\.model\s*\(/.test(content) ||
      /from\s+['"]@prisma\/client['"]/.test(content) ||
      /new\s+PrismaClient\s*\(/.test(content) ||
      /from\s+['"]@supabase\/supabase-admin['"]/.test(content) || // Server-side Supabase admin only
      /createServerClient\s*\(/.test(content) || // Supabase server-side SSR pattern
      /SUPABASE_SERVICE_ROLE_KEY/.test(content) || // Service role indicates backend
      /new\s+Pool\s*\(/.test(content) || // pg Pool
      /mysql\.createConnection\s*\(/.test(content)
    ) {
      return 'FULL_STACK';
    }

    // Other backend frameworks - import patterns
    if (
      /from\s+['"]fastify['"]/.test(content) ||
      /from\s+['"]koa['"]/.test(content) ||
      /from\s+['"]@hapi\//.test(content) ||
      /from\s+['"]@nestjs\//.test(content) ||
      /Fastify\s*\(\s*\)/.test(content) ||
      /new\s+Koa\s*\(\s*\)/.test(content)
    ) {
      return 'FULL_STACK';
    }

    // Server-side specific imports (not common in frontend)
    if (
      /from\s+['"]fs['"]/.test(content) ||
      /require\s*\(\s*['"]fs['"]\s*\)/.test(content) ||
      /from\s+['"]child_process['"]/.test(content) ||
      /from\s+['"]net['"]/.test(content)
    ) {
      return 'FULL_STACK';
    }
  }

  return 'FRONTEND_ONLY';
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Orchestrates preview mode selection between Browser (esbuild-wasm) and Railway.
 * Auto-selects based on app type:
 * - FRONTEND_ONLY → Browser (instant, in-browser via esbuild-wasm)
 * - FULL_STACK → Railway (deployed with real backend)
 */
export function PreviewContainer({
  appDataJson,
  appType: explicitAppType,
  // These props are passed from FullAppPreview but not yet used in BrowserPreview
  // TODO: Add responsive preview support to BrowserPreview
  isFullscreen: _isFullscreen = false,
  onCaptureReady: _onCaptureReady,
  devicePreset: _devicePreset = null,
  orientation: _orientation = 'portrait',
  previewWidth: _previewWidth = 1280,
  previewHeight: _previewHeight = 'auto',
  enableTouchSimulation: _enableTouchSimulation = true,
  showConsole: _showConsole = false,
  onConsoleToggle: _onConsoleToggle,
  showModeSelector = true,
  className = '',
}: PreviewContainerProps) {
  // Store state
  const previewMode = useAppStore((s) => s.previewMode) as PreviewMode;
  const setPreviewMode = useAppStore((s) => s.setPreviewMode);
  const currentComponent = useAppStore((s) => s.currentComponent);

  // Get appId from currentComponent or generate a default
  const appId = currentComponent?.id || `preview-${Date.now()}`;

  // Parse app data
  const appData = useMemo(() => {
    try {
      return JSON.parse(appDataJson);
    } catch {
      return null;
    }
  }, [appDataJson]);

  // Detect app type
  const detectedAppType = useMemo(() => {
    if (explicitAppType) return explicitAppType;
    if (!appData?.files) return 'FRONTEND_ONLY';
    return detectAppType(appData.files);
  }, [appData, explicitAppType]);

  // Auto-select mode based on app type
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  useEffect(() => {
    if (hasAutoSelected) return;

    // Auto-select Railway for full-stack apps, Browser for frontend-only
    if (detectedAppType === 'FULL_STACK') {
      setPreviewMode('railway');
    } else {
      setPreviewMode('browser');
    }

    setHasAutoSelected(true);
  }, [detectedAppType, hasAutoSelected, setPreviewMode]);

  // Handle mode change
  const handleModeChange = (mode: PreviewMode) => {
    setPreviewMode(mode);
  };

  // Show warning banner for full-stack apps in Browser mode
  const showFullStackWarning = detectedAppType === 'FULL_STACK' && previewMode === 'browser';

  if (!appData) {
    return (
      <div className={`flex items-center justify-center p-8 bg-zinc-800 rounded-lg ${className}`}>
        <div className="text-red-400">Failed to parse app data</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full min-h-0 ${className}`}>
      {/* Mode selector */}
      {showModeSelector && (
        <div className="flex items-center justify-between mb-2 px-1">
          <PreviewModeSelector mode={previewMode} onModeChange={handleModeChange} />
          {detectedAppType === 'FULL_STACK' && (
            <span className="text-xs text-purple-400 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"
                />
              </svg>
              Full-stack detected
            </span>
          )}
        </div>
      )}

      {/* Info banner for full-stack in Browser mode */}
      {showFullStackWarning && (
        <div className="mb-2 px-3 py-2 bg-blue-900/30 border border-blue-700/50 rounded-lg text-blue-300 text-xs flex items-center justify-between">
          <span>
            <span className="font-medium">Note:</span> API routes are mocked in-browser. For real
            database, switch to Full-Stack.
          </span>
          <button
            onClick={() => handleModeChange('railway')}
            className="ml-2 px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs transition-colors"
          >
            Switch to Full-Stack
          </button>
        </div>
      )}

      {/* Preview content */}
      <div id="sandpack-preview" className="flex-1 min-h-0">
        {previewMode === 'railway' ? (
          <RailwayPreview
            files={appData.files}
            dependencies={appData.dependencies || {}}
            appId={appId}
            appName={appData.name}
            showLogs={true}
            onReady={(url) => log.info('Railway preview ready', { url })}
            onError={(error) => log.error('Railway preview error', error)}
            className="h-full"
          />
        ) : (
          <BrowserPreview
            files={appData.files}
            onReady={() => log.info('Browser preview ready')}
            onError={(error) => log.error('Browser preview error', error)}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}

export default PreviewContainer;
