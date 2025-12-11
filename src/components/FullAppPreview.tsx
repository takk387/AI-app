'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PowerfulPreview from './PowerfulPreview';
import { useToast } from './Toast';
import { DeviceToolbar } from './preview';
import { useResponsivePreview } from '@/hooks/useResponsivePreview';
import { useSettings } from '@/hooks/useSettings';

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

  // Responsive preview state
  const {
    state: responsiveState,
    devicePresets,
    breakpoints,
    currentBreakpointName,
    selectDevicePreset,
    toggleOrientation,
    setScale,
    setWidth,
    resetToDefault,
  } = useResponsivePreview();

  // Local state for console and device frame visibility
  // Initialize from user settings and sync changes back
  const { settings, updatePreviewSettings } = useSettings();
  const [showConsole, setShowConsole] = useState(false); // Start collapsed, will sync on mount
  const [showDeviceFrame, setShowDeviceFrame] = useState(true);

  // Sync showConsole with settings on mount (but start collapsed per user request)
  // User can expand it and the preference will be remembered
  useEffect(() => {
    // We start collapsed, but if user has previously set showConsole to true in settings,
    // we could honor that. For now, keeping collapsed as default per request.
  }, [settings.preview.showConsole]);

  // Toggle console panel and persist to settings
  const handleToggleConsole = useCallback(() => {
    setShowConsole((prev) => {
      const newValue = !prev;
      updatePreviewSettings({ showConsole: newValue });
      return newValue;
    });
  }, [updatePreviewSettings]);

  // Toggle device frame
  const handleToggleDeviceFrame = useCallback(() => {
    setShowDeviceFrame((prev) => !prev);
  }, []);

  // Handle device selection
  const handleSelectDevice = useCallback(
    (deviceId: string) => {
      if (deviceId === 'none') {
        resetToDefault();
      } else {
        selectDevicePreset(deviceId);
      }
    },
    [selectDevicePreset, resetToDefault]
  );

  // Handle capture function from PowerfulPreview
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
      console.error('Parse error:', error);
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
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
        <p className="text-red-400">
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
              className="px-4 py-2 rounded-lg font-medium transition-all bg-blue-600 text-white"
            >
              💻 Code
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
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

      {/* Floating buttons when in fullscreen preview mode */}
      {activeTab === 'preview' && (
        <div className="fixed top-4 right-4 z-[110] flex items-center gap-2">
          {/* Capture for AI button */}
          <button
            onClick={handleCapture}
            disabled={isCapturing}
            className="px-4 py-2 rounded-lg bg-black/80 hover:bg-black text-white backdrop-blur-sm transition-all flex items-center gap-2 shadow-xl border border-white/20 disabled:opacity-50"
            title="Capture for AI"
          >
            {isCapturing ? (
              <span className="text-lg animate-spin">⟳</span>
            ) : captureSuccess ? (
              <span className="text-lg text-green-400">✓</span>
            ) : (
              <span className="text-lg">📷</span>
            )}
            <span className="text-sm font-medium">
              {isCapturing ? 'Capturing...' : captureSuccess ? 'Captured!' : 'Capture'}
            </span>
          </button>
          {/* Exit Fullscreen button */}
          <button
            onClick={() => setIsFullscreen(false)}
            className="px-4 py-2 rounded-lg bg-black/80 hover:bg-black text-white backdrop-blur-sm transition-all flex items-center gap-2 shadow-xl border border-white/20"
            title="Exit Fullscreen"
          >
            <span className="text-lg">⤓</span>
            <span className="text-sm font-medium">Exit Fullscreen</span>
          </button>
        </div>
      )}

      {/* Device Toolbar for fullscreen mode */}
      {activeTab === 'preview' && (
        <DeviceToolbar
          state={responsiveState}
          devicePresets={devicePresets}
          breakpoints={breakpoints}
          currentBreakpointName={currentBreakpointName}
          showConsole={showConsole}
          showDeviceFrame={showDeviceFrame}
          onSelectDevice={handleSelectDevice}
          onToggleOrientation={toggleOrientation}
          onSetScale={setScale}
          onSetWidth={setWidth}
          onResetToDefault={resetToDefault}
          onToggleConsole={handleToggleConsole}
          onToggleDeviceFrame={handleToggleDeviceFrame}
        />
      )}

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' ? (
          <div className="h-full w-full">
            <PowerfulPreview
              appDataJson={appDataJson}
              isFullscreen={true}
              onCaptureReady={handleCaptureReady}
              devicePreset={responsiveState.devicePreset}
              orientation={responsiveState.orientation}
              scale={responsiveState.scale}
              previewWidth={responsiveState.width}
              previewHeight={responsiveState.height}
              showDeviceFrame={showDeviceFrame}
              enableTouchSimulation={true}
              showConsole={showConsole}
              onConsoleToggle={handleToggleConsole}
            />
          </div>
        ) : (
          <div className="h-full flex">
            {/* File list */}
            <div className="w-64 bg-black/20 border-r border-white/10 overflow-y-auto">
              <div className="p-3 border-b border-white/10">
                <h3 className="text-xs font-semibold text-slate-400 uppercase">Files</h3>
              </div>
              {appData.files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file.path)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    selectedFile === file.path
                      ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-500'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">
                      {file.path.endsWith('.tsx') || file.path.endsWith('.ts')
                        ? '📘'
                        : file.path.endsWith('.css')
                          ? '🎨'
                          : file.path.endsWith('.json')
                            ? '⚙️'
                            : '📄'}
                    </span>
                    <span className="truncate">{file.path}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Code viewer */}
            <div className="flex-1 min-h-0 overflow-auto">
              {currentFile ? (
                <div className="h-full">
                  <div className="sticky top-0 bg-black/40 backdrop-blur-sm px-4 py-2 border-b border-white/10 flex items-center justify-between">
                    <span className="text-sm text-slate-300 font-mono">{currentFile.path}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentFile.content);
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
      {/* Device Toolbar */}
      <DeviceToolbar
        state={responsiveState}
        devicePresets={devicePresets}
        breakpoints={breakpoints}
        currentBreakpointName={currentBreakpointName}
        showConsole={showConsole}
        showDeviceFrame={showDeviceFrame}
        onSelectDevice={handleSelectDevice}
        onToggleOrientation={toggleOrientation}
        onSetScale={setScale}
        onSetWidth={setWidth}
        onResetToDefault={resetToDefault}
        onToggleConsole={handleToggleConsole}
        onToggleDeviceFrame={handleToggleDeviceFrame}
      />

      {/* Preview area */}
      <div className="flex-1 relative min-h-0">
        {/* Floating action buttons */}
        <div className="absolute top-4 right-4 z-[100] flex items-center gap-2">
          {/* Capture for AI button */}
          <button
            onClick={handleCapture}
            disabled={isCapturing}
            className="px-4 py-2 rounded-lg bg-black/80 hover:bg-black text-white backdrop-blur-sm transition-all flex items-center gap-2 shadow-xl border border-white/20 disabled:opacity-50"
            title="Capture for AI"
          >
            {isCapturing ? (
              <span className="text-lg animate-spin">⟳</span>
            ) : captureSuccess ? (
              <span className="text-lg text-green-400">✓</span>
            ) : (
              <span className="text-lg">📷</span>
            )}
            <span className="text-sm font-medium">
              {isCapturing ? 'Capturing...' : captureSuccess ? 'Captured!' : 'Capture'}
            </span>
          </button>
          {/* Fullscreen button */}
          <button
            onClick={() => setIsFullscreen(true)}
            className="px-4 py-2 rounded-lg bg-black/80 hover:bg-black text-white backdrop-blur-sm transition-all flex items-center gap-2 shadow-xl border border-white/20"
            title="Enter Fullscreen"
          >
            <span className="text-lg">⤢</span>
            <span className="text-sm font-medium">Fullscreen</span>
          </button>
        </div>

        <PowerfulPreview
          appDataJson={appDataJson}
          isFullscreen={false}
          onCaptureReady={handleCaptureReady}
          devicePreset={responsiveState.devicePreset}
          orientation={responsiveState.orientation}
          scale={responsiveState.scale}
          previewWidth={responsiveState.width}
          previewHeight={responsiveState.height}
          showDeviceFrame={showDeviceFrame}
          enableTouchSimulation={true}
          showConsole={showConsole}
          onConsoleToggle={handleToggleConsole}
        />
      </div>
    </div>
  );

  // Render via portal when fullscreen, otherwise render normally
  return (
    <>{isFullscreen && isClient ? createPortal(fullscreenContent, document.body) : normalContent}</>
  );
}
