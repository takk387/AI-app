'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PreviewContainer from './PreviewContainer';
import { useToast } from './Toast';
import { DeviceToolbar, type ResponsivePreviewState } from './preview';
import { FileTree } from './ui/FileTree';
import { useSettings } from '@/hooks/useSettings';
import { logger } from '@/utils/logger';

// ============================================================================
// DEVICE PRESETS
// ============================================================================

const DEVICE_PRESETS: Record<string, { width: number; height: number }> = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
};

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

interface FullAppPreviewProps {
  appDataJson: string;
  onScreenshot?: (image: string) => void;
}

export default function FullAppPreview({ appDataJson, onScreenshot }: FullAppPreviewProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState(false);
  const captureFunc = useRef<(() => Promise<string | null>) | null>(null);
  const { showToast } = useToast();

  // Responsive preview state - inline implementation after useResponsivePreview removal
  const [devicePreset, setDevicePreset] = useState<string>('desktop');
  const responsiveState: ResponsivePreviewState = useMemo(() => {
    const preset = DEVICE_PRESETS[devicePreset] || DEVICE_PRESETS.desktop;
    return {
      width: preset.width,
      height: preset.height,
      devicePreset,
      orientation: 'portrait' as const,
    };
  }, [devicePreset]);
  const selectDevicePreset = useCallback((presetId: string) => {
    setDevicePreset(presetId);
  }, []);

  // Local state for console visibility
  const { updatePreviewSettings } = useSettings();
  const [showConsole, setShowConsole] = useState(false);

  // Toggle console panel and persist to settings
  const handleToggleConsole = useCallback(() => {
    setShowConsole((prev) => {
      const newValue = !prev;
      updatePreviewSettings({ showConsole: newValue });
      return newValue;
    });
  }, [updatePreviewSettings]);

  // Handle capture function from PreviewContainer
  const handleCaptureReady = useCallback((fn: () => Promise<string | null>) => {
    captureFunc.current = fn;
  }, []);

  // Handle capture button click
  const handleCapture = useCallback(async () => {
    if (!captureFunc.current) {
      showToast({ type: 'error', message: 'Capture not ready - please wait for preview to load' });
      return;
    }

    setIsCapturing(true);
    const image = await captureFunc.current();
    setIsCapturing(false);

    if (image) {
      setCaptureSuccess(true);
      onScreenshot?.(image);
      showToast({
        type: 'success',
        message: 'Screenshot captured! Will be sent with your next message.',
      });
      setTimeout(() => setCaptureSuccess(false), 2000);
    } else {
      showToast({ type: 'error', message: 'Failed to capture screenshot. Please try again.' });
    }
  }, [onScreenshot, showToast]);

  // Detect client-side rendering for portal
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle body overflow when entering/exiting fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Memoize parsed app data
  const appData = useMemo(() => {
    try {
      return JSON.parse(appDataJson) as FullAppData;
    } catch (error) {
      logger.error('FullAppPreview: Failed to parse appDataJson', error);
      return null;
    }
  }, [appDataJson]);

  // Set initial selected file - moved to useEffect to avoid state update during render
  useEffect(() => {
    if (!selectedFile && appData?.files && appData.files.length > 0) {
      setSelectedFile(appData.files[0].path);
    }
  }, [selectedFile, appData]);

  // Handle parse error or missing files
  if (!appData || !appData.files || !Array.isArray(appData.files) || appData.files.length === 0) {
    return (
      <div className="p-6 bg-error-500/10 border border-error-500/20 rounded-xl">
        <p className="text-error-400">
          {!appData ? 'Error parsing app data' : 'No files found in app data'}
        </p>
      </div>
    );
  }

  const currentFile = appData.files.find((f) => f.path === selectedFile);

  // Fullscreen content that will be rendered via portal
  const fullscreenContent = (
    <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black flex flex-col overflow-hidden">
      {/* Header with tabs - conditionally hide in fullscreen preview mode */}
      {activeTab === 'code' && (
        <div className="flex items-center justify-between px-4 py-3 bg-black/30 border-b border-white/10">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('preview')}
              className="px-4 py-2 rounded-lg font-medium transition-all bg-slate-800 text-slate-400 hover:text-white"
            >
              👁️ Live Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className="px-4 py-2 rounded-lg font-medium transition-all bg-garden-600 text-white"
            >
              💻 Code
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="w-2 h-2 rounded-full bg-success-400 animate-pulse"></span>
              <span>Fully Interactive</span>
            </div>

            <button
              onClick={() => setIsFullscreen(false)}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all flex items-center gap-2"
              title="Exit Fullscreen"
            >
              <span className="text-lg">⤓</span>
              <span className="text-sm font-medium">Exit</span>
            </button>
          </div>
        </div>
      )}

      {/* Device Toolbar for fullscreen mode */}
      {activeTab === 'preview' && (
        <DeviceToolbar
          state={responsiveState}
          showConsole={showConsole}
          onSelectDevice={selectDevicePreset}
          onToggleConsole={handleToggleConsole}
          onCapture={handleCapture}
          isCapturing={isCapturing}
          captureSuccess={captureSuccess}
          onFullscreen={() => setIsFullscreen(false)}
          isFullscreen={true}
        />
      )}

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' ? (
          <div className="h-full w-full">
            <PreviewContainer
              appDataJson={appDataJson}
              appType={appData.appType}
              isFullscreen={true}
              onCaptureReady={handleCaptureReady}
              devicePreset={responsiveState.devicePreset}
              orientation={responsiveState.orientation}
              previewWidth={responsiveState.width}
              previewHeight={responsiveState.height}
              enableTouchSimulation={true}
              showConsole={showConsole}
              onConsoleToggle={handleToggleConsole}
              showModeSelector={true}
            />
          </div>
        ) : (
          <div className="h-full flex">
            {/* File tree */}
            <div className="w-64 bg-black/20 border-r border-white/10 flex flex-col">
              <div className="p-3 border-b border-white/10 flex-shrink-0">
                <h3 className="text-xs font-semibold text-slate-400 uppercase">Files</h3>
              </div>
              <FileTree
                files={appData.files}
                selectedPath={selectedFile}
                onSelectFile={setSelectedFile}
                className="flex-1 py-1"
                defaultExpandedDepth={2}
              />
            </div>

            {/* Code viewer */}
            <div className="flex-1 min-h-0 overflow-auto">
              {currentFile ? (
                <div className="h-full">
                  <div className="sticky top-0 bg-black/40 backdrop-blur-sm px-4 py-2 border-b border-white/10 flex items-center justify-between">
                    <span className="text-sm text-slate-300 font-mono">{currentFile.path}</span>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(currentFile.content);
                          showToast({ type: 'success', message: 'Copied to clipboard!' });
                        } catch {
                          showToast({ type: 'error', message: 'Failed to copy to clipboard' });
                        }
                      }}
                      className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <pre className="p-4 text-sm text-slate-300 font-mono overflow-x-auto">
                    <code>{currentFile.content}</code>
                  </pre>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  Select a file to view its contents
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Normal (non-fullscreen) content - shows the preview with a fullscreen button
  const normalContent = (
    <div className="h-full w-full flex flex-col relative">
      {/* Device Toolbar - Desktop/Phone toggle */}
      <div className="relative z-10 flex-shrink-0">
        <DeviceToolbar
          state={responsiveState}
          showConsole={showConsole}
          onSelectDevice={selectDevicePreset}
          onToggleConsole={handleToggleConsole}
          onCapture={handleCapture}
          isCapturing={isCapturing}
          captureSuccess={captureSuccess}
          onFullscreen={() => setIsFullscreen(true)}
          isFullscreen={false}
        />
      </div>

      {/* Preview area */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        <PreviewContainer
          appDataJson={appDataJson}
          appType={appData.appType}
          isFullscreen={false}
          onCaptureReady={handleCaptureReady}
          devicePreset={responsiveState.devicePreset}
          orientation={responsiveState.orientation}
          previewWidth={responsiveState.width}
          previewHeight={responsiveState.height}
          enableTouchSimulation={true}
          showConsole={showConsole}
          onConsoleToggle={handleToggleConsole}
          showModeSelector={true}
        />
      </div>
    </div>
  );

  // Render via portal when fullscreen, otherwise render normally
  return (
    <>{isFullscreen && isClient ? createPortal(fullscreenContent, document.body) : normalContent}</>
  );
}
