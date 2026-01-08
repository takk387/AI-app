'use client';

import { motion } from 'framer-motion';
import type {
  DeploymentProgress as DeploymentProgressType,
  DeploymentStep,
} from '@/types/deployment/unified';

interface DeploymentProgressProps {
  progress: DeploymentProgressType;
  onCancel?: () => void;
  onReset?: () => void;
}

function StepIndicator({ step }: { step: DeploymentStep }) {
  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return (
          <svg
            className="w-4 h-4"
            style={{ color: 'var(--success)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'in_progress':
        return (
          <div
            className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}
          />
        );
      case 'failed':
        return (
          <svg
            className="w-4 h-4"
            style={{ color: 'var(--error)' }}
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
        );
      case 'skipped':
        return (
          <svg
            className="w-4 h-4"
            style={{ color: 'var(--text-muted)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
        );
      default:
        return (
          <div
            className="w-4 h-4 rounded-full border-2"
            style={{ borderColor: 'var(--border-color)' }}
          />
        );
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
        {getStatusIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium"
          style={{
            color:
              step.status === 'failed'
                ? 'var(--error)'
                : step.status === 'in_progress'
                  ? 'var(--text-primary)'
                  : step.status === 'completed'
                    ? 'var(--text-secondary)'
                    : 'var(--text-muted)',
          }}
        >
          {step.name}
        </p>
        {step.message && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {step.message}
          </p>
        )}
        {step.error && (
          <p className="text-xs" style={{ color: 'var(--error)' }}>
            {step.error}
          </p>
        )}
      </div>
      {step.status === 'in_progress' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          In progress...
        </motion.div>
      )}
    </div>
  );
}

export function DeploymentProgress({ progress, onCancel, onReset }: DeploymentProgressProps) {
  const isComplete = progress.status === 'completed';
  const isFailed = progress.status === 'failed';
  const isInProgress = !isComplete && !isFailed;

  const getProgressBarColor = () => {
    if (isFailed) return 'var(--error)';
    if (isComplete) return 'var(--success)';
    return 'var(--accent-primary)';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isComplete ? 'Deployment Complete!' : isFailed ? 'Deployment Failed' : 'Deploying...'}
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {isComplete
              ? 'Your application has been deployed successfully.'
              : isFailed
                ? progress.error || 'An error occurred during deployment.'
                : `Deploying to ${progress.platform}...`}
          </p>
        </div>
        {isComplete && (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--success) 20%, transparent)' }}
          >
            <svg
              className="w-6 h-6"
              style={{ color: 'var(--success)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
        {isFailed && (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--error) 20%, transparent)' }}
          >
            <svg
              className="w-6 h-6"
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
        )}
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span style={{ color: 'var(--text-muted)' }}>Progress</span>
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {progress.overallProgress}%
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress.overallProgress}%` }}
            className="h-full rounded-full"
            style={{ background: getProgressBarColor() }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="rounded-lg p-4 space-y-4" style={{ background: 'var(--bg-tertiary)' }}>
        {progress.steps.map((step) => (
          <StepIndicator key={step.id} step={step} />
        ))}
      </div>

      {/* Deployment URL (if completed) */}
      {isComplete && progress.deploymentUrl && (
        <div
          className="rounded-lg p-4"
          style={{
            background: 'color-mix(in srgb, var(--success) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)',
          }}
        >
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--success)' }}>
            Your app is live at:
          </p>
          <a
            href={progress.deploymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline break-all transition-opacity hover:opacity-80"
            style={{ color: 'var(--accent-primary)' }}
          >
            {progress.deploymentUrl}
          </a>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 justify-end">
        {isInProgress && onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Cancel
          </button>
        )}
        {(isComplete || isFailed) && onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {isFailed ? 'Try Again' : 'Deploy Another'}
          </button>
        )}
        {isComplete && progress.deploymentUrl && (
          <a
            href={progress.deploymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent-primary)' }}
          >
            Visit Site
          </a>
        )}
      </div>
    </div>
  );
}
