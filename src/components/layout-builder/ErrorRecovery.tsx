'use client';

import { useState, useCallback, useEffect } from 'react';

export type ErrorType = 'network' | 'api' | 'ai' | 'validation' | 'render' | 'storage' | 'unknown';

export interface RecoverableError {
  id: string;
  type: ErrorType;
  title: string;
  message: string;
  details?: string;
  timestamp: Date;
  retryable: boolean;
  autoRecoverable?: boolean;
}

interface ErrorRecoveryProps {
  /** Current error to display */
  error: RecoverableError | null;
  /** Whether currently retrying */
  isRetrying?: boolean;
  /** Callback to retry the failed operation */
  onRetry?: () => void;
  /** Callback to dismiss the error */
  onDismiss?: () => void;
  /** Callback to undo last change (if applicable) */
  onUndo?: () => void;
  /** Callback to report the error */
  onReport?: (error: RecoverableError) => void;
  /** Whether auto-save is enabled */
  autoSaveEnabled?: boolean;
  /** Last auto-save timestamp */
  lastAutoSave?: Date | null;
  /** Optional class name */
  className?: string;
}

const ERROR_CONFIG: Record<ErrorType, { icon: string; color: string; bgColor: string }> = {
  network: {
    icon: '🌐',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/30',
  },
  api: {
    icon: '⚡',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/30',
  },
  ai: {
    icon: '🤖',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
  },
  validation: {
    icon: '⚠️',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
  },
  render: {
    icon: '🖼️',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
  },
  storage: {
    icon: '💾',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/30',
  },
  unknown: {
    icon: '❓',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10 border-slate-500/30',
  },
};

const HELPFUL_TIPS: Record<ErrorType, string[]> = {
  network: [
    'Check your internet connection',
    'Try refreshing the page',
    'The server might be temporarily unavailable',
  ],
  api: [
    'The API service might be overloaded',
    'Try again in a few moments',
    'Contact support if the issue persists',
  ],
  ai: [
    'The AI model might be busy',
    'Try simplifying your request',
    'Rephrase your design instructions',
  ],
  validation: [
    'Check your input for invalid values',
    'Some settings may conflict with each other',
    'Try resetting to default values',
  ],
  render: [
    'The preview may have complex elements',
    'Try simplifying the design',
    'Some styles may not be supported',
  ],
  storage: [
    'Your browser storage might be full',
    'Try clearing some cached data',
    'Check if cookies are enabled',
  ],
  unknown: [
    'An unexpected error occurred',
    'Try refreshing the page',
    'Your work has been auto-saved',
  ],
};

/**
 * ErrorRecovery Component
 *
 * Displays errors with helpful context and recovery options.
 * Supports retry, undo, dismiss, and error reporting.
 */
export function ErrorRecovery({
  error,
  isRetrying = false,
  onRetry,
  onDismiss,
  onUndo,
  onReport,
  autoSaveEnabled = true,
  lastAutoSave,
  className = '',
}: ErrorRecoveryProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetryCountdown, setAutoRetryCountdown] = useState<number | null>(null);

  const config = error ? ERROR_CONFIG[error.type] : null;
  const tips = error ? HELPFUL_TIPS[error.type] : [];

  // Auto-retry countdown for recoverable errors
  useEffect(() => {
    if (!error?.autoRecoverable || isRetrying || retryCount >= 3) return;

    setAutoRetryCountdown(5);
    const interval = setInterval(() => {
      setAutoRetryCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (prev === 1) {
            handleRetry();
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [error?.id, error?.autoRecoverable, isRetrying, retryCount]);

  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1);
    setAutoRetryCountdown(null);
    onRetry?.();
  }, [onRetry]);

  const handleDismiss = useCallback(() => {
    setRetryCount(0);
    setAutoRetryCountdown(null);
    setShowDetails(false);
    onDismiss?.();
  }, [onDismiss]);

  const handleReport = useCallback(() => {
    if (error && onReport) {
      onReport(error);
    }
  }, [error, onReport]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (!error) return null;

  return (
    <div className={`${className}`}>
      <div className={`rounded-xl border ${config?.bgColor} overflow-hidden`}>
        {/* Header */}
        <div className="px-4 py-3 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{config?.icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-medium ${config?.color}`}>{error.title}</h3>
            <p className="text-sm text-slate-300 mt-1">{error.message}</p>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Auto-save status */}
        {autoSaveEnabled && (
          <div className="px-4 py-2 bg-slate-800/50 border-t border-slate-700/50">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-400">✓</span>
              <span className="text-slate-400">
                Your work is auto-saved
                {lastAutoSave && ` (${formatTime(lastAutoSave)})`}
              </span>
            </div>
          </div>
        )}

        {/* Helpful tips */}
        <div className="px-4 py-3 border-t border-slate-700/50">
          <div className="text-xs text-slate-400 mb-2">What you can try:</div>
          <ul className="space-y-1.5">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="text-slate-500">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Error details (collapsible) */}
        {error.details && (
          <div className="border-t border-slate-700/50">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-4 py-2 flex items-center justify-between text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              <span>Technical Details</span>
              <svg
                className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showDetails && (
              <div className="px-4 pb-3">
                <pre className="text-xs text-slate-400 bg-slate-900 rounded-lg p-3 overflow-x-auto">
                  {error.details}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-3 border-t border-slate-700/50 flex items-center gap-2">
          {error.retryable && onRetry && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isRetrying ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Retrying...
                </>
              ) : autoRetryCountdown ? (
                `Retrying in ${autoRetryCountdown}s...`
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Try Again
                  {retryCount > 0 && ` (${retryCount})`}
                </>
              )}
            </button>
          )}

          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
              Undo
            </button>
          )}

          {onReport && (
            <button
              type="button"
              onClick={handleReport}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Report this error"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Cancel auto-retry */}
        {autoRetryCountdown && (
          <div className="px-4 py-2 border-t border-slate-700/50 text-center">
            <button
              type="button"
              onClick={() => setAutoRetryCountdown(null)}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancel auto-retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Inline error badge for smaller error displays
 */
export function ErrorBadge({ error, onClick }: { error: RecoverableError; onClick?: () => void }) {
  const config = ERROR_CONFIG[error.type];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${config.bgColor} ${config.color} hover:opacity-80 transition-opacity`}
    >
      <span>{config.icon}</span>
      <span>{error.title}</span>
    </button>
  );
}

/**
 * Toast-style error notification
 */
export function ErrorToast({
  error,
  onDismiss,
  onRetry,
  autoHide = true,
  hideDelay = 5000,
}: {
  error: RecoverableError;
  onDismiss?: () => void;
  onRetry?: () => void;
  autoHide?: boolean;
  hideDelay?: number;
}) {
  const config = ERROR_CONFIG[error.type];

  useEffect(() => {
    if (!autoHide || !onDismiss) return;

    const timeout = setTimeout(() => {
      onDismiss();
    }, hideDelay);

    return () => clearTimeout(timeout);
  }, [autoHide, hideDelay, onDismiss]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${config.bgColor} shadow-lg animate-in slide-in-from-top-2`}
    >
      <span className="text-lg">{config.icon}</span>
      <div className="flex-1">
        <p className={`text-sm font-medium ${config.color}`}>{error.title}</p>
        <p className="text-xs text-slate-400">{error.message}</p>
      </div>
      <div className="flex items-center gap-1">
        {error.retryable && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="p-1.5 text-slate-400 hover:text-white transition-colors"
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
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorRecovery;
