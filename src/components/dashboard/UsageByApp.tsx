'use client';

import { motion } from 'framer-motion';
import type { AppUsageBreakdown } from '@/types/api-gateway';

// ============================================================================
// TYPES
// ============================================================================

interface UsageByAppProps {
  appUsage: AppUsageBreakdown[];
  isLoading?: boolean;
  onViewDetails?: (appId: string) => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format cents to dollar string
 */
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format large numbers with K/M suffix
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) {
    return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  }
  if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }
  if (bytes >= 1_024) {
    return `${(bytes / 1_024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

/**
 * Get platform icon
 */
function getPlatformIcon(platform: string): React.ReactNode {
  switch (platform.toLowerCase()) {
    case 'web':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
      );
    case 'ios':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      );
    case 'android':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 00-.83.22l-1.88 3.24a11.463 11.463 0 00-8.94 0L5.65 5.67a.643.643 0 00-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 001 18h22a10.78 10.78 0 00-5.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z" />
        </svg>
      );
    case 'windows':
    case 'macos':
    case 'linux':
    case 'desktop':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      );
  }
}

// ============================================================================
// APP USAGE ROW COMPONENT
// ============================================================================

interface AppUsageRowProps {
  app: AppUsageBreakdown;
  index: number;
  onViewDetails?: (appId: string) => void;
}

function AppUsageRow({ app, index, onViewDetails }: AppUsageRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 rounded-lg transition-colors"
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-light)',
      }}
    >
      {/* App Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
            }}
          >
            {getPlatformIcon(app.platform)}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {app.appName}
            </p>
            <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
              {app.platform}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(app.totalCostCents)}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            this period
          </p>
        </div>
      </div>

      {/* Usage Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            API Cost
          </p>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(app.apiCostCents)}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Requests
          </p>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {formatNumber(app.requests)}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Bandwidth
          </p>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {formatBytes(app.bandwidthBytes)}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            DB Ops
          </p>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {formatNumber(app.dbOperations)}
          </p>
        </div>
      </div>

      {/* View Details Button */}
      {onViewDetails && (
        <button
          type="button"
          onClick={() => onViewDetails(app.appId)}
          className="w-full text-center py-2 text-sm font-medium rounded-lg transition-colors"
          style={{ color: 'var(--accent-primary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          View Details
        </button>
      )}
    </motion.div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function UsageByAppSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg" style={{ background: 'var(--bg-secondary)' }} />
              <div className="space-y-1">
                <div className="h-4 w-24 rounded" style={{ background: 'var(--bg-secondary)' }} />
                <div className="h-3 w-12 rounded" style={{ background: 'var(--bg-secondary)' }} />
              </div>
            </div>
            <div className="space-y-1 text-right">
              <div className="h-5 w-16 rounded" style={{ background: 'var(--bg-secondary)' }} />
              <div
                className="h-3 w-12 rounded ml-auto"
                style={{ background: 'var(--bg-secondary)' }}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="space-y-1">
                <div className="h-3 w-12 rounded" style={{ background: 'var(--bg-secondary)' }} />
                <div className="h-4 w-8 rounded" style={{ background: 'var(--bg-secondary)' }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyAppUsageState() {
  return (
    <div className="text-center py-8 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
      <svg
        className="w-12 h-12 mx-auto mb-3"
        style={{ color: 'var(--text-muted)' }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        No deployed apps yet
      </p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
        Deploy an app to see usage breakdown here
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UsageByApp({ appUsage, isLoading, onViewDetails }: UsageByAppProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-xl p-5"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Usage by App
        </h3>
        <UsageByAppSkeleton />
      </div>
    );
  }

  // Sort apps by total cost descending
  const sortedApps = [...appUsage].sort((a, b) => b.totalCostCents - a.totalCostCents);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-5"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Usage by App
        </h3>
        {sortedApps.length > 0 && (
          <span
            className="text-xs px-2 py-1 rounded-full"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
            }}
          >
            {sortedApps.length} app{sortedApps.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {sortedApps.length === 0 ? (
        <EmptyAppUsageState />
      ) : (
        <div className="space-y-3">
          {sortedApps.map((app, index) => (
            <AppUsageRow key={app.appId} app={app} index={index} onViewDetails={onViewDetails} />
          ))}
        </div>
      )}

      {/* Total Summary */}
      {sortedApps.length > 0 && (
        <div
          className="flex items-center justify-between pt-4 mt-4"
          style={{ borderTop: '1px solid var(--border-color)' }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Total across all apps
          </span>
          <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(sortedApps.reduce((sum, app) => sum + app.totalCostCents, 0))}
          </span>
        </div>
      )}
    </motion.div>
  );
}
