'use client';

import { motion } from 'framer-motion';
import type {
  DeployedApp,
  DeploymentPlatform,
  DeployedAppStatus,
  HostingProvider,
  DatabaseProvider,
} from '@/types/deployment/unified';
import { formatRelativeTime } from '@/types/dashboard';

// ============================================================================
// TYPES
// ============================================================================

interface DeploymentHistoryProps {
  deployments: DeployedApp[];
  isLoading?: boolean;
  onViewDeployment?: (id: string) => void;
  maxItems?: number;
}

interface StatusConfig {
  label: string;
  color: string;
}

interface PlatformConfig {
  icon: React.ReactNode;
  label: string;
}

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================

/**
 * Get status configuration using CSS variables
 */
function getStatusConfig(status: DeployedAppStatus): StatusConfig {
  switch (status) {
    case 'active':
      return { label: 'Active', color: 'var(--success)' };
    case 'deploying':
      return { label: 'Deploying', color: 'var(--warning)' };
    case 'pending':
      return { label: 'Pending', color: 'var(--info)' };
    case 'failed':
      return { label: 'Failed', color: 'var(--error)' };
    case 'stopped':
      return { label: 'Stopped', color: 'var(--text-muted)' };
    case 'deleted':
      return { label: 'Deleted', color: 'var(--text-muted)' };
    default:
      return { label: 'Unknown', color: 'var(--text-muted)' };
  }
}

// ============================================================================
// PLATFORM CONFIGURATION
// ============================================================================

/**
 * Get platform icon and label
 */
function getPlatformConfig(platform: DeploymentPlatform): PlatformConfig {
  switch (platform) {
    case 'web':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
        ),
        label: 'Web',
      };
    case 'ios':
      return {
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
        ),
        label: 'iOS',
      };
    case 'android':
      return {
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 00-.83.22l-1.88 3.24a11.463 11.463 0 00-8.94 0L5.65 5.67a.643.643 0 00-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 001 18h22a10.78 10.78 0 00-5.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z" />
          </svg>
        ),
        label: 'Android',
      };
    case 'windows':
      return {
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 5.548l7.05-.96v6.803H3V5.548zm0 12.904l7.05.96v-6.803H3v5.843zm7.95 1.088l10.05 1.368V12.61H10.95v6.93zm0-14.08v6.93H21V4.092L10.95 5.46z" />
          </svg>
        ),
        label: 'Windows',
      };
    case 'macos':
      return {
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
        ),
        label: 'macOS',
      };
    case 'linux':
      return {
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.504 0c-.155 0-.311.001-.465.003-.653.014-1.283.062-1.885.142a8.29 8.29 0 00-2.086.562c-.671.29-1.288.674-1.818 1.163-.53.49-.97 1.084-1.301 1.77-.331.687-.547 1.462-.631 2.309-.084.847-.038 1.764.134 2.74.172.975.477 2.006.913 3.08a26.33 26.33 0 001.467 3.164c.56 1.029 1.193 2.026 1.881 2.983.688.957 1.43 1.871 2.203 2.731.773.86 1.576 1.666 2.389 2.404a23.8 23.8 0 002.385 1.921c.763.537 1.513 1.003 2.234 1.397.722.394 1.414.716 2.06.966.647.25 1.246.427 1.787.531a6.83 6.83 0 001.379.155c.396 0 .779-.035 1.141-.105a4.93 4.93 0 001.072-.371 4.13 4.13 0 001.003-.672c.303-.276.568-.6.788-.972.22-.372.394-.792.516-1.258.122-.466.188-.977.188-1.532 0-.555-.066-1.154-.198-1.793a14.13 14.13 0 00-.565-1.935 16.7 16.7 0 00-.901-2.006 19.26 19.26 0 00-1.188-2.006 20.34 20.34 0 00-1.419-1.905 19.55 19.55 0 00-1.593-1.703 17.3 17.3 0 00-1.71-1.402 14.04 14.04 0 00-1.77-1.001 10.31 10.31 0 00-1.773-.5 7.04 7.04 0 00-1.717-.002z" />
          </svg>
        ),
        label: 'Linux',
      };
    default:
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
            />
          </svg>
        ),
        label: 'Unknown',
      };
  }
}

/**
 * Get provider label
 */
function getProviderLabel(hosting?: HostingProvider, database?: DatabaseProvider): string | null {
  const parts: string[] = [];

  if (hosting) {
    parts.push(hosting === 'cloudflare' ? 'Cloudflare' : 'Vercel');
  }

  if (database) {
    switch (database) {
      case 'turso':
        parts.push('Turso');
        break;
      case 'neon':
        parts.push('Neon');
        break;
      case 'byo':
        parts.push('Custom DB');
        break;
    }
  }

  return parts.length > 0 ? parts.join(' + ') : null;
}

// ============================================================================
// DEPLOYMENT ITEM COMPONENT
// ============================================================================

interface DeploymentItemProps {
  deployment: DeployedApp;
  index: number;
  onView?: (id: string) => void;
}

function DeploymentItem({ deployment, index, onView }: DeploymentItemProps) {
  const statusConfig = getStatusConfig(deployment.status);
  const platformConfig = getPlatformConfig(deployment.platform);
  const providerLabel = getProviderLabel(deployment.hostingProvider, deployment.databaseProvider);

  const handleVisit = () => {
    if (deployment.deploymentUrl) {
      window.open(deployment.deploymentUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-4 p-4 rounded-lg transition-colors"
      style={{ background: 'var(--bg-tertiary)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
    >
      {/* Platform Icon */}
      <div
        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-secondary)',
        }}
      >
        {platformConfig.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {platformConfig.label}
          </span>

          {/* Status Badge */}
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: `color-mix(in srgb, ${statusConfig.color} 15%, transparent)`,
              color: statusConfig.color,
            }}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* URL or Domain */}
        {(deployment.deploymentUrl || deployment.customDomain) && (
          <p className="mt-0.5 text-sm truncate" style={{ color: 'var(--text-muted)' }}>
            {deployment.customDomain || deployment.deploymentUrl}
          </p>
        )}

        {/* Provider and Timestamp */}
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {providerLabel && (
            <>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {providerLabel}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>&middot;</span>
            </>
          )}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {deployment.lastDeployedAt
              ? formatRelativeTime(deployment.lastDeployedAt)
              : formatRelativeTime(deployment.createdAt)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {deployment.deploymentUrl && deployment.status === 'active' && (
          <button
            type="button"
            onClick={handleVisit}
            className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors text-white"
            style={{ background: 'var(--accent-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent-primary)')}
          >
            Visit
          </button>
        )}

        {onView && (
          <button
            type="button"
            onClick={() => onView(deployment.id)}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--hover-bg)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function DeploymentSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-lg animate-pulse"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <div
            className="flex-shrink-0 w-10 h-10 rounded-lg"
            style={{ background: 'var(--border-color)' }}
          />
          <div className="flex-1 space-y-2">
            <div className="h-4 rounded w-1/3" style={{ background: 'var(--border-color)' }} />
            <div className="h-3 rounded w-2/3" style={{ background: 'var(--border-color)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyDeploymentState() {
  return (
    <div className="text-center py-8 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
      <svg
        className="w-10 h-10 mx-auto mb-3"
        style={{ color: 'var(--text-muted)' }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        No deployments yet
      </p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
        Your deployed apps will appear here
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DeploymentHistory({
  deployments,
  isLoading,
  onViewDeployment,
  maxItems = 5,
}: DeploymentHistoryProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-xl p-5"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <DeploymentSkeleton />
      </div>
    );
  }

  if (!deployments || deployments.length === 0) {
    return <EmptyDeploymentState />;
  }

  const displayDeployments = deployments.slice(0, maxItems);

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div className="space-y-3">
        {displayDeployments.map((deployment, index) => (
          <DeploymentItem
            key={deployment.id}
            deployment={deployment}
            index={index}
            onView={onViewDeployment}
          />
        ))}
      </div>

      {deployments.length > maxItems && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button
            type="button"
            className="text-sm font-medium w-full text-center py-2 rounded-lg transition-colors"
            style={{ color: 'var(--accent-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            View all deployments
          </button>
        </div>
      )}
    </div>
  );
}
