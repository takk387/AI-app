'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { getRailwayService, type RailwayDeploymentStatus } from '@/services/RailwayService';
import type { AppFile } from '@/types/railway';

// ============================================================================
// TYPES
// ============================================================================

interface RailwayPreviewProps {
  files: AppFile[];
  dependencies?: Record<string, string>;
  appId: string; // Required - unique identifier for project reuse
  appName?: string;
  showLogs?: boolean;
  onReady?: (url: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

type PreviewStatus = 'initializing' | 'creating' | 'building' | 'deploying' | 'ready' | 'error';

/**
 * Create a stable hash of files array for dependency comparison
 */
function hashFiles(files: AppFile[]): string {
  return files.map((f) => `${f.path}:${f.content.length}`).join('|');
}

/**
 * Create a stable hash of dependencies object
 */
function hashDependencies(deps: Record<string, string>): string {
  return Object.entries(deps)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}@${v}`)
    .join(',');
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RailwayPreview({
  files,
  dependencies = {},
  appId,
  appName,
  showLogs = true,
  onReady,
  onError,
  className = '',
}: RailwayPreviewProps) {
  const [status, setStatus] = useState<PreviewStatus>('initializing');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [showLogsPanel, setShowLogsPanel] = useState(showLogs);
  const [elapsedTime, setElapsedTime] = useState(0);
  const mountedRef = useRef(true);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasDeployedRef = useRef(false);

  // Store callbacks in refs to avoid re-triggering effects
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  // Create stable hashes for files and dependencies
  const filesHash = useMemo(() => hashFiles(files), [files]);
  const depsHash = useMemo(() => hashDependencies(dependencies), [dependencies]);

  // Append to build logs
  const appendLog = useCallback((log: string) => {
    if (!mountedRef.current) return;
    setBuildLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
  }, []);

  // Start elapsed time timer
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (startTimeRef.current && mountedRef.current) {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
  }, []);

  // Stop timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Map Railway status to preview status
  const mapStatus = (railwayStatus: RailwayDeploymentStatus): PreviewStatus => {
    switch (railwayStatus) {
      case 'creating':
        return 'creating';
      case 'building':
        return 'building';
      case 'deploying':
        return 'deploying';
      case 'ready':
        return 'ready';
      case 'error':
        return 'error';
      case 'cleaning_up':
        // Cleaning up is not an error - keep current status
        return 'deploying';
      default:
        return 'initializing';
    }
  };

  // Initialize Railway deployment
  // Uses hashes for stable dependencies to prevent multiple deployments
  useEffect(() => {
    // Prevent multiple deployments for the same files
    if (hasDeployedRef.current) {
      return;
    }

    mountedRef.current = true;
    hasDeployedRef.current = true;

    const service = getRailwayService();

    // Set up event handlers (using refs for callbacks to avoid stale closures)
    service.setEventHandlers({
      onStatusChange: (railwayStatus) => {
        if (!mountedRef.current) return;
        const newStatus = mapStatus(railwayStatus);
        setStatus(newStatus);
        appendLog(`Status: ${railwayStatus}`);
      },
      onBuildLog: (log) => {
        if (mountedRef.current) {
          appendLog(log);
        }
      },
      onReady: (url) => {
        if (!mountedRef.current) return;
        stopTimer();
        setPreviewUrl(url);
        setStatus('ready');
        appendLog(`Deployment ready at ${url}`);
        onReadyRef.current?.(url);
      },
      onError: (err) => {
        if (!mountedRef.current) return;
        stopTimer();
        setError(err);
        setStatus('error');
        appendLog(`Error: ${err.message}`);
        onErrorRef.current?.(err);
      },
    });

    // Start deployment
    (async () => {
      try {
        setStatus('creating');
        startTimer();
        appendLog('Creating Railway deployment...');

        await service.deploy(files, dependencies, appId, appName);

        if (!mountedRef.current) return;
        appendLog('Deployment created, waiting for build...');
      } catch (err) {
        if (mountedRef.current) {
          stopTimer();
          const deployError = err instanceof Error ? err : new Error(String(err));
          setError(deployError);
          setStatus('error');
          appendLog(`Deployment failed: ${deployError.message}`);
          onErrorRef.current?.(deployError);
        }
      }
    })();

    return () => {
      mountedRef.current = false;
      stopTimer();
      // Clear event handlers to prevent memory leaks
      service.clearEventHandlers();
      // Note: We don't cleanup deployment immediately to allow re-using
      // Cleanup happens via auto-timeout or explicit call
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Using hashes for stable dependencies
  }, [filesHash, depsHash, appId, appName]);

  // Format elapsed time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Get status message
  const getStatusMessage = (): string => {
    switch (status) {
      case 'initializing':
        return 'Initializing...';
      case 'creating':
        return 'Creating Railway project...';
      case 'building':
        return 'Building application...';
      case 'deploying':
        return 'Deploying to Railway...';
      case 'ready':
        return 'Deployment ready!';
      case 'error':
        return 'Deployment failed';
      default:
        return 'Processing...';
    }
  };

  // Render error state
  if (status === 'error' && error) {
    return (
      <div className={`flex flex-col ${className}`}>
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-800 rounded-lg flex-1">
          <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <div className="text-red-400 text-lg font-medium mb-2">Deployment Failed</div>
          <div className="text-zinc-400 text-sm text-center max-w-md">{error.message}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg text-sm transition-colors"
          >
            Try Again
          </button>
        </div>
        {showLogs && (
          <BuildLogsPanel
            logs={buildLogs}
            isOpen={showLogsPanel}
            onToggle={() => setShowLogsPanel(!showLogsPanel)}
          />
        )}
      </div>
    );
  }

  // Render loading states
  if (status !== 'ready') {
    return (
      <div className={`flex flex-col ${className}`}>
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-800 rounded-lg flex-1">
          {/* Railway logo/icon */}
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 15l7-7 7 7" />
              <path d="M12 3v18" />
            </svg>
          </div>

          {/* Progress indicator */}
          <div className="w-64 h-2 bg-zinc-700 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 animate-pulse"
              style={{
                width:
                  status === 'creating'
                    ? '25%'
                    : status === 'building'
                      ? '60%'
                      : status === 'deploying'
                        ? '90%'
                        : '10%',
              }}
            />
          </div>

          <div className="text-zinc-300 text-sm font-medium">{getStatusMessage()}</div>
          <div className="text-zinc-500 text-xs mt-2">
            Elapsed: {formatTime(elapsedTime)}
            {status === 'building' && ' (typically 30-60 seconds)'}
          </div>

          {/* Status steps - inside loading block so status is never 'ready' */}
          <div className="flex items-center gap-2 mt-6">
            <StatusStep
              label="Create"
              active={status === 'creating'}
              completed={status === 'building' || status === 'deploying'}
            />
            <div className="w-8 h-0.5 bg-zinc-700" />
            <StatusStep
              label="Build"
              active={status === 'building'}
              completed={status === 'deploying'}
            />
            <div className="w-8 h-0.5 bg-zinc-700" />
            <StatusStep label="Deploy" active={status === 'deploying'} completed={false} />
          </div>
        </div>

        {showLogs && (
          <BuildLogsPanel
            logs={buildLogs}
            isOpen={showLogsPanel}
            onToggle={() => setShowLogsPanel(!showLogsPanel)}
          />
        )}
      </div>
    );
  }

  // Render preview iframe
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex-1 relative bg-white rounded-lg overflow-hidden">
        {previewUrl && (
          <>
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="Railway Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
            {/* URL bar */}
            <div className="absolute top-0 left-0 right-0 bg-zinc-900/90 backdrop-blur-sm px-3 py-1.5 flex items-center gap-2 border-b border-zinc-700">
              <div className="w-2 h-2 rounded-full bg-green-500" title="Connected" />
              <span className="text-zinc-400 text-xs font-mono truncate flex-1">{previewUrl}</span>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Open in new tab"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </>
        )}
      </div>

      {showLogs && (
        <BuildLogsPanel
          logs={buildLogs}
          isOpen={showLogsPanel}
          onToggle={() => setShowLogsPanel(!showLogsPanel)}
        />
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusStep({
  label,
  active,
  completed,
}: {
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
          completed
            ? 'bg-green-600 text-white'
            : active
              ? 'bg-purple-600 text-white animate-pulse'
              : 'bg-zinc-700 text-zinc-400'
        }`}
      >
        {completed ? '✓' : active ? '...' : '○'}
      </div>
      <span className={`text-xs ${active || completed ? 'text-zinc-300' : 'text-zinc-500'}`}>
        {label}
      </span>
    </div>
  );
}

function BuildLogsPanel({
  logs,
  isOpen,
  onToggle,
}: {
  logs: string[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="mt-2 text-zinc-400 hover:text-zinc-200 text-xs py-1 flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        Show Build Logs ({logs.length})
      </button>
    );
  }

  return (
    <div className="relative mt-2">
      <button
        onClick={onToggle}
        className="absolute top-1 right-1 z-10 text-zinc-400 hover:text-zinc-200 text-xs px-2 py-0.5 bg-zinc-800 rounded"
      >
        Hide
      </button>
      <div className="h-32 bg-zinc-900 rounded-lg overflow-hidden">
        <div className="h-full overflow-auto p-2 font-mono text-xs">
          {logs.map((log, i) => (
            <div key={i} className="text-zinc-400 whitespace-pre-wrap">
              {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}

export default RailwayPreview;
