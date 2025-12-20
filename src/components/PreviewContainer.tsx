'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import PowerfulPreview from './PowerfulPreview';
import { RailwayPreview } from './preview/RailwayPreview';
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
  // Pass-through props for PowerfulPreview
  isFullscreen?: boolean;
  onCaptureReady?: (captureFunc: () => Promise<string | null>) => void;
  devicePreset?: string | null;
  orientation?: 'portrait' | 'landscape';
  previewWidth?: number;
  previewHeight?: number | 'auto';
  enableTouchSimulation?: boolean;
  showConsole?: boolean;
  onConsoleToggle?: () => void;
  showDeviceFrame?: boolean;
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
    if (
      /mongoose\.connect\s*\(/.test(content) ||
      /mongoose\.model\s*\(/.test(content) ||
      /from\s+['"]@prisma\/client['"]/.test(content) ||
      /new\s+PrismaClient\s*\(/.test(content) ||
      /from\s+['"]@supabase\/supabase-js['"]/.test(content) ||
      /createClient\s*\(\s*process\.env\./.test(content) || // Supabase pattern with env vars
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
 * Orchestrates preview mode selection between Sandpack and Railway.
 * Auto-selects based on app type:
 * - FRONTEND_ONLY → Sandpack (instant, in-browser)
 * - FULL_STACK → Railway (deployed with real backend)
 */
export function PreviewContainer({
  appDataJson,
  appType: explicitAppType,
  isFullscreen = false,
  onCaptureReady,
  devicePreset = null,
  orientation = 'portrait',
  previewWidth = 1280,
  previewHeight = 'auto',
  enableTouchSimulation = true,
  showConsole = false,
  onConsoleToggle,
  showDeviceFrame = true,
  showModeSelector = true,
  className = '',
}: PreviewContainerProps) {
  // Store state - cast to new PreviewMode type
  const previewMode = useAppStore((s) => s.previewMode) as PreviewMode;
  const setPreviewMode = useAppStore((s) => s.setPreviewMode);

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

    // Auto-select Railway for full-stack apps, Sandpack for frontend-only
    if (detectedAppType === 'FULL_STACK') {
      setPreviewMode('railway');
    } else {
      setPreviewMode('sandpack');
    }

    setHasAutoSelected(true);
  }, [detectedAppType, hasAutoSelected, setPreviewMode]);

  // Handle mode change
  const handleModeChange = (mode: PreviewMode) => {
    setPreviewMode(mode);
  };

  // Show warning banner for full-stack apps in Sandpack mode
  const showFullStackWarning = detectedAppType === 'FULL_STACK' && previewMode === 'sandpack';

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

      {/* Warning banner for full-stack in Sandpack */}
      {showFullStackWarning && (
        <div className="mb-2 px-3 py-2 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-yellow-300 text-xs flex items-center justify-between">
          <span>
            <span className="font-medium">Note:</span> Backend code won&apos;t run in Frontend mode.
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
      <div className="flex-1 min-h-0">
        {previewMode === 'railway' ? (
          <RailwayPreview
            files={appData.files}
            dependencies={appData.dependencies || {}}
            appName={appData.name}
            showLogs={true}
            onReady={(url) => log.info('Railway preview ready', { url })}
            onError={(error) => log.error('Railway preview error', error)}
            className="h-full"
          />
        ) : (
          <PowerfulPreview
            appDataJson={appDataJson}
            isFullscreen={isFullscreen}
            onCaptureReady={onCaptureReady}
            devicePreset={devicePreset}
            orientation={orientation}
            previewWidth={previewWidth}
            previewHeight={previewHeight}
            enableTouchSimulation={enableTouchSimulation}
            showConsole={showConsole}
            onConsoleToggle={onConsoleToggle}
            showDeviceFrame={showDeviceFrame}
          />
        )}
      </div>
    </div>
  );
}

export default PreviewContainer;
