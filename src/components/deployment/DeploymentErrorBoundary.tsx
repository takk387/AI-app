'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

export interface DeploymentErrorReport {
  id: string;
  timestamp: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  componentStack: string;
  deploymentContext?: {
    platform?: 'web' | 'mobile' | 'desktop';
    step?: string;
    appId?: string;
  };
}

interface Props {
  children: ReactNode;
  platform?: 'web' | 'mobile' | 'desktop';
  appId?: string;
  step?: string;
  onRetry?: () => void;
  onCancel?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  report: DeploymentErrorReport | null;
  retryCount: number;
  copied: boolean;
}

const MAX_AUTO_RETRIES = 3;

// ============================================================================
// DEPLOYMENT ERROR BOUNDARY
// ============================================================================

/**
 * DeploymentErrorBoundary
 *
 * Specialized error boundary for deployment flows with:
 * - Automatic retry for transient failures
 * - Deployment context capture
 * - User-friendly error messages
 * - Recovery options
 */
export class DeploymentErrorBoundary extends Component<Props, State> {
  private copyTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      report: null,
      retryCount: 0,
      copied: false,
    };
  }

  componentWillUnmount(): void {
    if (this.copyTimeoutId) {
      clearTimeout(this.copyTimeoutId);
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const report: DeploymentErrorReport = {
      id: `deploy_err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack || '',
      deploymentContext: {
        platform: this.props.platform,
        step: this.props.step,
        appId: this.props.appId,
      },
    };

    console.error('[DeploymentErrorBoundary] Caught error:', report);

    this.setState({
      error,
      errorInfo,
      report,
    });
  }

  handleRetry = (): void => {
    const { retryCount } = this.state;
    const { onRetry } = this.props;

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      report: null,
      retryCount: retryCount + 1,
    });

    if (onRetry) {
      onRetry();
    }
  };

  handleCancel = (): void => {
    const { onCancel } = this.props;

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      report: null,
      retryCount: 0,
      copied: false,
    });

    if (onCancel) {
      onCancel();
    }
  };

  handleCopyError = (): void => {
    const { report } = this.state;
    if (!report) return;

    // Clear any existing timeout
    if (this.copyTimeoutId) {
      clearTimeout(this.copyTimeoutId);
    }

    const errorText = JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(errorText).then(
      () => {
        this.setState({ copied: true });
        this.copyTimeoutId = setTimeout(() => {
          this.setState({ copied: false });
          this.copyTimeoutId = null;
        }, 2000);
      },
      () => {
        console.warn('[DeploymentErrorBoundary] Failed to copy error to clipboard');
      }
    );
  };

  /**
   * Get user-friendly error message based on error type
   */
  getErrorMessage(): { title: string; description: string; suggestion: string } {
    const { error } = this.state;
    const errorMessage = error?.message?.toLowerCase() || '';

    // Network errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('timeout')
    ) {
      return {
        title: 'Connection Issue',
        description: 'Unable to reach the deployment server.',
        suggestion: 'Check your internet connection and try again.',
      };
    }

    // Authentication errors
    if (
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('401') ||
      errorMessage.includes('auth')
    ) {
      return {
        title: 'Authentication Failed',
        description: 'Your session may have expired.',
        suggestion: 'Try refreshing the page or signing in again.',
      };
    }

    // Rate limiting
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return {
        title: 'Too Many Requests',
        description: "You've hit the rate limit for deployments.",
        suggestion: 'Wait a few minutes before trying again.',
      };
    }

    // Quota/limit errors
    if (
      errorMessage.includes('quota') ||
      errorMessage.includes('limit') ||
      errorMessage.includes('exceeded')
    ) {
      return {
        title: 'Limit Reached',
        description: "You've reached a deployment limit.",
        suggestion: 'Consider upgrading your plan or removing unused deployments.',
      };
    }

    // Build errors
    if (errorMessage.includes('build') || errorMessage.includes('compile')) {
      return {
        title: 'Build Failed',
        description: 'There was an error building your application.',
        suggestion: 'Check your code for errors and try again.',
      };
    }

    // Default error
    return {
      title: 'Deployment Error',
      description: error?.message || 'An unexpected error occurred during deployment.',
      suggestion: 'Try again or contact support if the issue persists.',
    };
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    const { error } = this.state;
    const errorMessage = error?.message?.toLowerCase() || '';

    // Non-retryable errors
    const nonRetryable = [
      'unauthorized',
      '401',
      '403',
      'forbidden',
      'quota',
      'limit exceeded',
      'invalid',
      'not found',
    ];

    return !nonRetryable.some((term) => errorMessage.includes(term));
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const { retryCount, report } = this.state;
      const { platform } = this.props;
      const errorInfo = this.getErrorMessage();
      const canRetry = this.isRetryable() && retryCount < MAX_AUTO_RETRIES;

      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center p-8 text-center"
          role="alert"
          aria-live="assertive"
        >
          {/* Error Icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'color-mix(in srgb, var(--error) 10%, transparent)' }}
          >
            <svg
              className="w-8 h-8"
              style={{ color: 'var(--error)' }}
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

          {/* Error Title */}
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            {errorInfo.title}
          </h3>

          {/* Platform Badge */}
          {platform && (
            <span
              className="text-xs px-2 py-1 rounded-full mb-3"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-muted)',
              }}
            >
              {platform.charAt(0).toUpperCase() + platform.slice(1)} Deployment
            </span>
          )}

          {/* Error Description */}
          <p className="text-sm mb-2 max-w-md" style={{ color: 'var(--text-secondary)' }}>
            {errorInfo.description}
          </p>

          {/* Suggestion */}
          <p className="text-xs mb-6 max-w-md" style={{ color: 'var(--text-muted)' }}>
            {errorInfo.suggestion}
          </p>

          {/* Retry Count */}
          {retryCount > 0 && (
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Retry attempts: {retryCount}/{MAX_AUTO_RETRIES}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3" role="group" aria-label="Error actions">
            {canRetry && (
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                style={{
                  background: 'var(--accent-primary)',
                  color: 'white',
                }}
                aria-label="Retry deployment"
              >
                Try Again
              </button>
            )}
            <button
              type="button"
              onClick={this.handleCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
              }}
              aria-label={canRetry ? 'Cancel and dismiss error' : 'Close error dialog'}
            >
              {canRetry ? 'Cancel' : 'Close'}
            </button>
          </div>

          {/* Copy Error Button */}
          {report && (
            <button
              type="button"
              onClick={this.handleCopyError}
              className="mt-4 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{
                background: this.state.copied
                  ? 'color-mix(in srgb, var(--success) 20%, transparent)'
                  : 'var(--bg-tertiary)',
                color: this.state.copied ? 'var(--success)' : 'var(--text-muted)',
              }}
              aria-label="Copy error details to clipboard"
            >
              {this.state.copied ? 'Copied!' : 'Copy Error Details'}
            </button>
          )}

          {/* Error ID for support */}
          {report && (
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Error ID:{' '}
              <code
                className="px-1.5 py-0.5 rounded font-mono text-[10px]"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                }}
              >
                {report.id}
              </code>
            </p>
          )}
        </motion.div>
      );
    }

    return this.props.children;
  }
}

export default DeploymentErrorBoundary;
