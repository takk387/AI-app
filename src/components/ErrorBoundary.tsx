"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { logger } from '@/utils/logger';

/**
 * Error Report structure for persisted errors
 */
export interface ErrorReport {
  id: string;
  timestamp: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  componentStack: string;
  storeSnapshot: {
    currentMode: string;
    isGenerating: boolean;
    messagesCount: number;
    componentsCount: number;
    hasAppConcept: boolean;
    hasPendingChange: boolean;
    activeTab: string;
  };
  url: string;
  userAgent: string;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  report: ErrorReport | null;
}

const ERROR_STORAGE_KEY = 'error_reports';
const MAX_STORED_ERRORS = 10;

/**
 * Get stored error reports from localStorage
 */
export function getStoredErrorReports(): ErrorReport[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(ERROR_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Clear stored error reports
 */
export function clearStoredErrorReports(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(ERROR_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Error Boundary component to catch JavaScript errors anywhere in the child
 * component tree, log those errors, and display a fallback UI.
 *
 * Enhanced with:
 * - Store state snapshot capture
 * - Error persistence to localStorage
 * - Structured logging integration
 *
 * This prevents the entire app from crashing when a component throws an error.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      report: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Capture store state snapshot (wrapped in try-catch to prevent cascade failures)
    let storeSnapshot: ErrorReport['storeSnapshot'] = {
      currentMode: 'unknown',
      isGenerating: false,
      messagesCount: 0,
      componentsCount: 0,
      hasAppConcept: false,
      hasPendingChange: false,
      activeTab: 'preview',
    };

    try {
      const storeState = useAppStore.getState();
      storeSnapshot = {
        currentMode: storeState.currentMode || 'unknown',
        isGenerating: storeState.isGenerating || false,
        messagesCount: storeState.chatMessages?.length || 0,
        componentsCount: storeState.components?.length || 0,
        hasAppConcept: !!storeState.appConcept,
        hasPendingChange: !!storeState.pendingChange,
        activeTab: storeState.activeTab || 'preview',
      };
    } catch (storeError) {
      // Store access failed - use defaults and log the failure
      logger.warn('Failed to capture store state in ErrorBoundary', {
        storeError: storeError instanceof Error ? storeError.message : String(storeError),
      });
    }

    // Generate error report
    const report: ErrorReport = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack || '',
      storeSnapshot,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    // Log with structured logger
    logger.error('React Error Boundary caught error', error, {
      reportId: report.id,
      componentStack: errorInfo.componentStack,
      storeSnapshot: report.storeSnapshot,
    });

    // Persist to localStorage
    this.persistError(report);

    // Update component state
    this.setState({
      error,
      errorInfo,
      report,
    });
  }

  /**
   * Persist error report to localStorage (keeps last N errors)
   */
  private persistError(report: ErrorReport): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = getStoredErrorReports();
      stored.unshift(report);

      // Keep only the last N errors
      const trimmed = stored.slice(0, MAX_STORED_ERRORS);
      localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (err) {
      // localStorage might be full or unavailable
      logger.warn('Failed to persist error report', { error: err });
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      report: null,
    });
  };

  /**
   * Copy error details to clipboard
   */
  handleCopyError = (): void => {
    if (!this.state.report) return;

    const errorText = JSON.stringify(this.state.report, null, 2);

    navigator.clipboard.writeText(errorText).then(
      () => {
        // Could show a toast here
        logger.info('Error report copied to clipboard');
      },
      () => {
        logger.warn('Failed to copy error report to clipboard');
      }
    );
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, report } = this.state;

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
          <div className="max-w-lg w-full bg-slate-800/50 border border-red-500/30 rounded-xl p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <div>
                <h2 className="text-xl font-bold text-red-400">Something went wrong</h2>
                <p className="text-sm text-slate-400">An unexpected error occurred</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-black/30 rounded-lg border border-red-500/20">
                <p className="text-sm font-mono text-red-300 break-words">
                  {error.message}
                </p>
              </div>
            )}

            {/* Error ID for support reference */}
            {report && (
              <div className="mb-4 text-xs text-slate-500">
                Error ID: <code className="text-slate-400">{report.id}</code>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
              >
                Reload Page
              </button>
            </div>

            {/* Copy error button */}
            <button
              onClick={this.handleCopyError}
              className="w-full mt-3 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm"
            >
              Copy Error Details
            </button>

            {/* Development-only details */}
            {process.env.NODE_ENV === 'development' && (
              <>
                {/* Component Stack */}
                {errorInfo && (
                  <details className="mt-4">
                    <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-300">
                      Component Stack
                    </summary>
                    <pre className="mt-2 p-3 bg-black/30 rounded-lg text-xs text-slate-400 overflow-auto max-h-48">
                      {errorInfo.componentStack}
                    </pre>
                  </details>
                )}

                {/* Store Snapshot */}
                {report && (
                  <details className="mt-2">
                    <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-300">
                      App State Snapshot
                    </summary>
                    <pre className="mt-2 p-3 bg-black/30 rounded-lg text-xs text-slate-400 overflow-auto max-h-48">
                      {JSON.stringify(report.storeSnapshot, null, 2)}
                    </pre>
                  </details>
                )}

                {/* Full Error Stack */}
                {error?.stack && (
                  <details className="mt-2">
                    <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-300">
                      Error Stack Trace
                    </summary>
                    <pre className="mt-2 p-3 bg-black/30 rounded-lg text-xs text-slate-400 overflow-auto max-h-48">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
