'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getWebContainerService, type RuntimeStatus } from '@/lib/WebContainerService';
import type { AppFile } from '@/types/railway';

interface WebContainerPreviewProps {
  files: AppFile[];
  dependencies?: Record<string, string>;
  className?: string;
  onReady?: (url: string) => void;
  onError?: (error: string) => void;
  onTerminalOutput?: (data: string) => void;
}

const STATUS_LABELS: Record<RuntimeStatus, string> = {
  idle: 'Initializing...',
  booting: 'Booting runtime...',
  mounting: 'Loading project files...',
  installing: 'Installing dependencies...',
  running: 'Starting dev server...',
  ready: 'Preview ready',
  error: 'Preview failed',
};

export function WebContainerPreview({
  files,
  dependencies = {},
  className = '',
  onReady,
  onError,
  onTerminalOutput,
}: WebContainerPreviewProps) {
  const [status, setStatus] = useState<RuntimeStatus>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mountedRef = useRef(true);
  const lastFilesHashRef = useRef<string>('');

  const addTerminalLine = useCallback(
    (line: string) => {
      if (!mountedRef.current) return;
      setTerminalLines((prev) => [...prev.slice(-100), line]);
      onTerminalOutput?.(line);
    },
    [onTerminalOutput]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!files.length) return;

    const filesHash = JSON.stringify(files.map((f) => f.path + f.content.length));
    if (filesHash === lastFilesHashRef.current) return;
    lastFilesHashRef.current = filesHash;

    const service = getWebContainerService();

    const unsubStatus = service.onStatusChange((s) => {
      if (mountedRef.current) setStatus(s);
    });

    const unsubReady = service.onServerReady((_port, url) => {
      if (mountedRef.current) {
        setPreviewUrl(url);
        onReady?.(url);
      }
    });

    (async () => {
      try {
        await service.boot();
        await service.mountProject(files, dependencies);
        const exitCode = await service.install(addTerminalLine);
        if (exitCode !== 0) {
          setErrorMessage(`npm install failed (exit ${exitCode})`);
          onError?.(`npm install failed (exit ${exitCode})`);
          return;
        }
        await service.startDev(addTerminalLine);
      } catch (error) {
        if (mountedRef.current) {
          const msg = error instanceof Error ? error.message : 'Preview failed';
          setErrorMessage(msg);
          setStatus('error');
          onError?.(msg);
        }
      }
    })();

    return () => {
      unsubStatus();
      unsubReady();
    };
  }, [files, dependencies, addTerminalLine, onReady, onError]);

  // Error state
  if (status === 'error' || errorMessage) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full gap-3 p-6 ${className}`}
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
        >
          ✕
        </div>
        <p className="text-sm font-medium">Preview Error</p>
        <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-muted)' }}>
          {errorMessage ?? 'An unexpected error occurred'}
        </p>
        <button
          onClick={() => {
            setErrorMessage(null);
            setStatus('idle');
            lastFilesHashRef.current = '';
          }}
          className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'white',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Loading state
  if (status !== 'ready' || !previewUrl) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full gap-4 p-6 ${className}`}
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: 'var(--gold-primary)' }}
          />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {STATUS_LABELS[status]}
          </p>
        </div>

        {/* Progress steps */}
        <div className="flex gap-1.5">
          {(['booting', 'mounting', 'installing', 'running'] as RuntimeStatus[]).map((step) => {
            const steps: RuntimeStatus[] = ['booting', 'mounting', 'installing', 'running'];
            const currentIdx = steps.indexOf(status);
            const stepIdx = steps.indexOf(step);
            const isDone = stepIdx < currentIdx;
            const isCurrent = stepIdx === currentIdx;
            return (
              <div
                key={step}
                className="h-1 w-8 rounded-full transition-colors"
                style={{
                  backgroundColor: isDone
                    ? 'var(--accent-primary)'
                    : isCurrent
                      ? 'var(--gold-primary)'
                      : 'var(--border-color)',
                }}
              />
            );
          })}
        </div>

        {/* Terminal output during install */}
        {terminalLines.length > 0 && (status === 'installing' || status === 'running') && (
          <div
            className="w-full max-w-md mt-2 rounded-lg overflow-hidden text-xs font-mono max-h-32 overflow-y-auto p-2"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)',
            }}
          >
            {terminalLines.slice(-8).map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all leading-relaxed">
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Ready — show iframe
  return (
    <div className={`h-full w-full ${className}`}>
      <iframe
        ref={iframeRef}
        src={previewUrl}
        className="w-full h-full border-0"
        title="WebContainer Preview"
        allow="cross-origin-isolated"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
    </div>
  );
}

export default WebContainerPreview;
