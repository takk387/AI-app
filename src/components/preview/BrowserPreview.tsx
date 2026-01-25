'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { getBrowserPreviewService } from '@/services/BrowserPreviewService';
import type { AppFile } from '@/types/railway';

// ============================================================================
// TYPES
// ============================================================================

interface BrowserPreviewProps {
  files: AppFile[];
  entryPoint?: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

type PreviewStatus = 'initializing' | 'bundling' | 'ready' | 'error';

/**
 * Simple string hash for content comparison
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Create a stable hash of files array for dependency comparison
 * Uses content hash instead of length for accurate change detection
 */
function hashFiles(files: AppFile[]): string {
  return files
    .map((f) => `${f.path}:${simpleHash(f.content)}`)
    .sort()
    .join('|');
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * In-browser preview using esbuild-wasm.
 * Bundles React/TypeScript code instantly without server deployment.
 */
export function BrowserPreview({
  files,
  entryPoint = 'App.tsx',
  onReady,
  onError,
  className = '',
}: BrowserPreviewProps) {
  const [status, setStatus] = useState<PreviewStatus>('initializing');
  const [html, setHtml] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [hasDatabase, setHasDatabase] = useState(false);
  const [hasApiRoutes, setHasApiRoutes] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mountedRef = useRef(true);

  // Store callbacks in refs to avoid re-triggering effects
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  // Create stable hash for files
  const filesHash = useMemo(() => hashFiles(files), [files]);

  // Bundle files when they change
  useEffect(() => {
    mountedRef.current = true;

    const bundle = async () => {
      try {
        setStatus('initializing');
        setErrors([]);
        setWarnings([]);

        const service = getBrowserPreviewService();

        setStatus('bundling');
        const result = await service.bundle(files, { entryPoint });

        if (!mountedRef.current) return;

        if (result.errors.length > 0) {
          setErrors(result.errors);
          setStatus('error');
          onErrorRef.current?.(new Error(result.errors.join('\n')));
          return;
        }

        setHtml(result.html);
        setWarnings(result.warnings);
        setHasDatabase(result.hasDatabase ?? false);
        setHasApiRoutes(result.hasApiRoutes ?? false);
        setStatus('ready');
        onReadyRef.current?.();
      } catch (error) {
        if (!mountedRef.current) return;
        const err = error instanceof Error ? error : new Error(String(error));
        setErrors([err.message]);
        setStatus('error');
        onErrorRef.current?.(err);
      }
    };

    bundle();

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Using hash for stable dependency
  }, [filesHash, entryPoint]);

  // Update iframe content when HTML changes
  useEffect(() => {
    if (!html || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;

    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }
  }, [html]);

  // Handle iframe messages (console logs, errors)
  useEffect(() => {
    const MAX_ERRORS = 10; // Limit error accumulation to prevent memory issues

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'error') {
        setErrors((prev) => {
          const newErrors = [...prev, event.data.message];
          // Keep only the last MAX_ERRORS to prevent unbounded growth
          return newErrors.slice(-MAX_ERRORS);
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Refresh preview
  const handleRefresh = useCallback(() => {
    if (iframeRef.current && html) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [html]);

  // Render error state
  if (status === 'error' && errors.length > 0) {
    return (
      <div className={`flex flex-col ${className}`}>
        <div className="flex flex-col p-6 bg-slate-800 rounded-lg flex-1 overflow-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-error-900/50 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-error-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <div className="text-error-400 font-medium">Build Error</div>
              <div className="text-slate-500 text-sm">
                {errors.length} error{errors.length !== 1 ? 's' : ''} found
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {errors.map((error, i) => (
              <div
                key={i}
                className="p-3 bg-error-950/30 border border-error-900/50 rounded-lg text-error-300 text-sm font-mono whitespace-pre-wrap"
              >
                {error}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render loading state
  if (status !== 'ready') {
    return (
      <div className={`flex flex-col ${className}`}>
        <div className="flex flex-col items-center justify-center p-8 bg-slate-800 rounded-lg flex-1">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-garden-600 to-garden-400 flex items-center justify-center mb-6 shadow-lg animate-pulse">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <div className="text-slate-300 text-sm font-medium">
            {status === 'initializing' ? 'Initializing bundler...' : 'Bundling...'}
          </div>
          <div className="text-slate-500 text-xs mt-2">Using esbuild-wasm for instant preview</div>
        </div>
      </div>
    );
  }

  // Render preview iframe
  return (
    <div className={`flex flex-col ${className}`}>
      {/* Warnings banner */}
      {warnings.length > 0 && (
        <div className="mb-2 px-3 py-2 bg-warning-900/30 border border-warning-700/50 rounded-lg">
          <div className="text-warning-300 text-xs font-medium mb-1">
            {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
          </div>
          {warnings.slice(0, 3).map((warning, i) => (
            <div key={i} className="text-warning-400/70 text-xs truncate">
              {warning}
            </div>
          ))}
          {warnings.length > 3 && (
            <div className="text-warning-500/50 text-xs mt-1">+{warnings.length - 3} more</div>
          )}
        </div>
      )}

      {/* Preview iframe */}
      <div className="flex-1 relative bg-white rounded-lg overflow-hidden">
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          title="Browser Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />

        {/* Toolbar */}
        <div className="absolute top-0 left-0 right-0 bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 flex items-center gap-2 border-b border-slate-700">
          <div className="w-2 h-2 rounded-full bg-success-500" title="Ready" />
          <span className="text-slate-400 text-xs font-mono flex-1">Browser Preview</span>

          {/* Feature indicators */}
          {hasDatabase && (
            <span
              className="text-xs px-1.5 py-0.5 rounded bg-gold-900/50 text-gold-300 border border-gold-700/50"
              title="In-browser SQLite database active"
            >
              DB
            </span>
          )}
          {hasApiRoutes && (
            <span
              className="text-xs px-1.5 py-0.5 rounded bg-garden-900/50 text-garden-300 border border-garden-700/50"
              title="API route mocking active"
            >
              API
            </span>
          )}

          <button
            onClick={handleRefresh}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default BrowserPreview;
