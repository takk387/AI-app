'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useBrowserSupport } from '@/hooks/useBrowserSupport';
import PowerfulPreview from './PowerfulPreview';
import { WebContainerPreview } from './preview/WebContainerPreview';
import { PreviewModeSelector, type PreviewMode } from './preview/PreviewModeSelector';

// ============================================================================
// TYPES
// ============================================================================

interface AppFile {
  path: string;
  content: string;
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
 * Detect if app requires backend/full-stack capabilities
 */
function detectAppType(files: AppFile[]): 'FRONTEND_ONLY' | 'FULL_STACK' {
  for (const file of files) {
    const path = file.path.toLowerCase();
    const content = file.content.toLowerCase();

    // API routes
    if (path.includes('/api/') || path.includes('api/')) {
      return 'FULL_STACK';
    }

    // Server files
    if (path.includes('server.js') || path.includes('server.ts') || path.includes('server/index')) {
      return 'FULL_STACK';
    }

    // Express/backend indicators in content
    if (
      content.includes('express()') ||
      content.includes("require('express')") ||
      content.includes("from 'express'") ||
      content.includes('createserver') ||
      content.includes('app.listen(')
    ) {
      return 'FULL_STACK';
    }

    // Next.js API route patterns
    if (content.includes('nextapiresponse') || content.includes('nextapirequest')) {
      return 'FULL_STACK';
    }

    // Database connections
    if (
      content.includes('mongoose.connect') ||
      content.includes('prisma') ||
      content.includes('createclient') // Supabase
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
 * Orchestrates preview mode selection between Sandpack and WebContainers.
 * Auto-selects based on app type and browser support.
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
  // Store state
  const previewMode = useAppStore((s) => s.previewMode);
  const setPreviewMode = useAppStore((s) => s.setPreviewMode);
  const setWebContainerStatus = useAppStore((s) => s.setWebContainerStatus);

  // Browser support
  const { supportsWebContainers } = useBrowserSupport();

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

  // Auto-select mode based on app type and browser support
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  useEffect(() => {
    if (hasAutoSelected) return;

    // Auto-select WebContainer for full-stack apps if supported
    if (detectedAppType === 'FULL_STACK' && supportsWebContainers) {
      setPreviewMode('webcontainer');
    } else {
      setPreviewMode('sandpack');
    }

    setHasAutoSelected(true);
  }, [detectedAppType, supportsWebContainers, hasAutoSelected, setPreviewMode]);

  // Handle mode change
  const handleModeChange = (mode: PreviewMode) => {
    setPreviewMode(mode);
    if (mode === 'webcontainer') {
      setWebContainerStatus('idle');
    }
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
    <div className={`flex flex-col ${className}`}>
      {/* Mode selector */}
      {showModeSelector && (
        <div className="flex items-center justify-between mb-2 px-1">
          <PreviewModeSelector mode={previewMode} onModeChange={handleModeChange} />
          {detectedAppType === 'FULL_STACK' && (
            <span className="text-xs text-blue-400">Full-stack app detected</span>
          )}
        </div>
      )}

      {/* Warning banner */}
      {showFullStackWarning && (
        <div className="mb-2 px-3 py-2 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-yellow-300 text-xs">
          ⚠️ This app has backend code that won&apos;t work in Sandpack.
          {supportsWebContainers ? (
            <button
              onClick={() => handleModeChange('webcontainer')}
              className="ml-2 underline hover:text-yellow-200"
            >
              Switch to WebContainer
            </button>
          ) : (
            <span className="ml-1">WebContainers not supported in your browser.</span>
          )}
        </div>
      )}

      {/* Preview content */}
      <div className="flex-1">
        {previewMode === 'webcontainer' ? (
          <WebContainerPreview
            files={appData.files}
            dependencies={appData.dependencies || {}}
            showTerminal={true}
            onReady={() => setWebContainerStatus('ready')}
            onError={() => setWebContainerStatus('error')}
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
