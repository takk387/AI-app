'use client';

import React, { useMemo, useEffect, useCallback } from 'react';
import { SandpackProvider, SandpackPreview, SandpackLayout } from '@codesandbox/sandpack-react';
import { DeviceFrame, TouchSimulator, ConsolePanel } from './preview';
import type { DeviceType } from './preview/DeviceFrame';

interface AppFile {
  path: string;
  content: string;
  description: string;
}

interface FullAppData {
  name: string;
  description: string;
  appType?: 'FRONTEND_ONLY' | 'FULL_STACK';
  files: AppFile[];
  dependencies: Record<string, string>;
  setupInstructions: string;
}

interface PowerfulPreviewProps {
  appDataJson: string;
  isFullscreen?: boolean;
  onCaptureReady?: (captureFunc: () => Promise<string | null>) => void;
  // Responsive preview props
  devicePreset?: string | null;
  orientation?: 'portrait' | 'landscape';
  previewWidth?: number;
  previewHeight?: number | 'auto';
  enableTouchSimulation?: boolean;
  showConsole?: boolean;
  onConsoleToggle?: () => void;
  showDeviceFrame?: boolean;
}

export default function PowerfulPreview({
  appDataJson,
  isFullscreen = false,
  onCaptureReady,
  // Responsive preview props with defaults
  devicePreset = null,
  orientation = 'portrait',
  previewWidth = 1280,
  previewHeight = 'auto',
  enableTouchSimulation = true,
  showConsole = false,
  onConsoleToggle,
  showDeviceFrame = true,
}: PowerfulPreviewProps) {
  // Determine if touch simulation should be active (mobile/tablet devices only)
  const isMobileOrTablet =
    devicePreset && ['iphone-se', 'iphone-14', 'ipad', 'ipad-pro'].includes(devicePreset);
  const shouldEnableTouchSimulation = enableTouchSimulation && isMobileOrTablet;
  // Parse JSON with error handling to prevent crashes
  const appData = useMemo((): FullAppData | null => {
    try {
      return JSON.parse(appDataJson) as FullAppData;
    } catch (error) {
      console.error('PowerfulPreview: Failed to parse appDataJson:', error);
      return null;
    }
  }, [appDataJson]);

  // Capture function that sends files to the API for server-side screenshot
  const capturePreview = useCallback(async (): Promise<string | null> => {
    try {
      if (!appData) return null;

      const response = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: appData.files,
          name: appData.name,
          dependencies: appData.dependencies,
          width: 1280,
          height: 720,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Screenshot failed');
      }

      const { image } = await response.json();
      return image;
    } catch (error) {
      console.error('Capture failed:', error);
      return null;
    }
  }, [appData]);

  // Pass capture function to parent via callback
  useEffect(() => {
    onCaptureReady?.(capturePreview);
  }, [capturePreview, onCaptureReady]);

  // Memoize file conversion and dependencies to prevent recalculation on every render
  // Must be called before early return to satisfy React hooks rules
  const { sandpackFiles, dependencies } = useMemo(() => {
    // Return empty values if appData is invalid - will be caught by early return below
    if (!appData || !appData.files || !Array.isArray(appData.files) || appData.files.length === 0) {
      return { sandpackFiles: {}, dependencies: {} };
    }

    // Convert files to Sandpack format - React template needs / prefix
    const files: Record<string, { code: string }> = {};

    appData.files.forEach((file) => {
      // Map file paths to Sandpack structure
      let sandpackPath = file.path;

      // Handle different file structures - remove src/ prefix
      if (sandpackPath.startsWith('src/')) {
        sandpackPath = sandpackPath.substring(4); // Remove 'src/' (4 characters)
      }

      // Keep as App.tsx for TypeScript support
      if (
        sandpackPath === 'App.tsx' ||
        sandpackPath === 'app/page.tsx' ||
        sandpackPath === 'page.tsx'
      ) {
        sandpackPath = 'App.tsx';
      }

      // Add leading / for Sandpack react template
      if (!sandpackPath.startsWith('/') && !sandpackPath.startsWith('public/')) {
        sandpackPath = '/' + sandpackPath;
      }

      // Sandpack file format uses objects with 'code' property
      files[sandpackPath] = { code: file.content };
    });

    // Ensure we have /App.tsx
    if (!files['/App.tsx']) {
      console.error('No /App.tsx found in files:', Object.keys(files));
    }

    // Add index.tsx for TypeScript support
    if (!files['/index.tsx'] && !files['/index.js']) {
      files['/index.tsx'] = {
        code: `import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);`,
      };
    }

    // Add styles.css - Sandpack format
    if (!files['/styles.css']) {
      files['/styles.css'] = {
        code: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  margin: 0;
}`,
      };
    }

    // Add public/index.html with Tailwind CDN
    files['/public/index.html'] = {
      code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appData.name || 'App'}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`,
    };

    // Filter out incompatible dependencies for react-ts template
    // Next.js and related packages don't work with Sandpack's React SPA template
    const incompatiblePackages = [
      'next',
      'next-themes',
      '@next/font',
      '@next/mdx',
      'eslint-config-next',
    ];

    const filteredUserDeps = Object.fromEntries(
      Object.entries(appData.dependencies || {}).filter(
        ([pkg]) => !incompatiblePackages.some((p) => pkg === p || pkg.startsWith(`${p}/`))
      )
    );

    // Merge user dependencies with required ones
    const deps = {
      react: '^18.0.0',
      'react-dom': '^18.0.0',
      'react-scripts': '^5.0.0',
      ...filteredUserDeps,
    };

    return { sandpackFiles: files, dependencies: deps };
  }, [appData]);

  // Handle parse error or missing files (after hooks to satisfy React rules)
  if (!appData || !appData.files || !Array.isArray(appData.files) || appData.files.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-center p-6">
          <p className="text-red-400 mb-2">Failed to load preview</p>
          <p className="text-slate-500 text-sm">
            {!appData ? 'Invalid app data format' : 'No files found in app data'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex"
      style={{
        minHeight: isFullscreen ? '100vh' : '600px',
        height: isFullscreen ? '100vh' : '100%',
      }}
    >
      <SandpackProvider
        template="react-ts"
        theme="dark"
        files={sandpackFiles}
        customSetup={{
          dependencies,
        }}
        options={{
          autorun: true,
          autoReload: true,
          recompileMode: 'immediate',
          externalResources: ['https://cdn.tailwindcss.com'],
        }}
        style={{ height: '100%', width: '100%' }}
      >
        {/* Flex wrapper - SandpackProvider adds wrapper divs that break outer flex layout */}
        <div className="flex w-full h-full">
          {/* Main preview area - always centered */}
          <div className="flex-1 flex flex-col bg-zinc-950 overflow-auto relative items-center justify-center p-4">
            {/* Full-stack warning badge */}
            {appData.appType === 'FULL_STACK' && (
              <div className="absolute top-4 left-4 bg-yellow-500/90 text-yellow-900 px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50">
                ⚠️ Preview mode: Backend features disabled
              </div>
            )}

            {/* All devices render through DeviceFrame when enabled */}
            {/* Key forces remount on device change to prevent white screen issues */}
            <TouchSimulator
              enabled={shouldEnableTouchSimulation}
              iframeSelector=".sp-preview-iframe"
            >
              {showDeviceFrame ? (
                <DeviceFrame
                  device={(devicePreset as DeviceType) || 'laptop'}
                  orientation={orientation}
                  width={previewWidth}
                  height={previewHeight === 'auto' ? 800 : previewHeight}
                >
                  <SandpackLayout
                    key={`${devicePreset}-${orientation}-${previewWidth}`}
                    style={{
                      height: '100%',
                      width: '100%',
                      border: 'none',
                      borderRadius: 0,
                    }}
                  >
                    <SandpackPreview
                      showOpenInCodeSandbox={false}
                      showRefreshButton={true}
                      style={{
                        height: '100%',
                        width: '100%',
                      }}
                    />
                  </SandpackLayout>
                </DeviceFrame>
              ) : (
                <SandpackLayout
                  key={`no-frame-${previewWidth}-${previewHeight}`}
                  style={{
                    height: previewHeight === 'auto' ? 800 : previewHeight,
                    width: previewWidth,
                    border: 'none',
                    borderRadius: 8,
                  }}
                >
                  <SandpackPreview
                    showOpenInCodeSandbox={false}
                    showRefreshButton={true}
                    style={{
                      height: '100%',
                      width: '100%',
                    }}
                  />
                </SandpackLayout>
              )}
            </TouchSimulator>
          </div>

          {/* Console side panel */}
          <ConsolePanel isOpen={showConsole} onToggle={onConsoleToggle || (() => {})} />
        </div>
      </SandpackProvider>
    </div>
  );
}
