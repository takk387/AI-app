'use client';

import { motion } from 'framer-motion';
import type { MonthlyUsageSummary, CurrentUsage } from '@/types/api-gateway';

// ============================================================================
// TYPES
// ============================================================================

interface UsageStatsProps {
  currentUsage: CurrentUsage | null;
  isLoading?: boolean;
}

interface ServiceUsage {
  name: string;
  icon: React.ReactNode;
  units: number;
  unitLabel: string;
  costCents: number;
  color: string;
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
 * Get service usage data from monthly summary
 */
function getServiceUsages(usage: MonthlyUsageSummary): ServiceUsage[] {
  return [
    {
      name: 'OpenAI',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
        </svg>
      ),
      units: usage.openaiTokens,
      unitLabel: 'tokens',
      costCents: usage.openaiCostCents,
      color: 'var(--success)',
    },
    {
      name: 'Anthropic',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.304 3.541l-5.357 16.918h-3.093L3.496 3.541h3.25l3.696 12.07L14.054 3.54zm3.2 0L15.146 20.46h-2.924l5.357-16.918z" />
        </svg>
      ),
      units: usage.anthropicTokens,
      unitLabel: 'tokens',
      costCents: usage.anthropicCostCents,
      color: 'var(--warning)',
    },
    {
      name: 'Email',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
      units: usage.emailsSent,
      unitLabel: 'sent',
      costCents: usage.emailCostCents,
      color: 'var(--info)',
    },
    {
      name: 'SMS',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
      units: usage.smsSent,
      unitLabel: 'sent',
      costCents: usage.smsCostCents,
      color: 'var(--accent-primary)',
    },
    {
      name: 'Storage',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
          />
        </svg>
      ),
      units: usage.storageBytes,
      unitLabel: 'used',
      costCents: usage.storageCostCents,
      color: 'var(--text-secondary)',
    },
  ];
}

// ============================================================================
// SERVICE ROW COMPONENT
// ============================================================================

interface ServiceRowProps {
  service: ServiceUsage;
  index: number;
}

function ServiceRow({ service, index }: ServiceRowProps) {
  const formattedUnits =
    service.name === 'Storage' ? formatBytes(service.units) : formatNumber(service.units);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between py-3"
      style={{ borderBottom: '1px solid var(--border-light)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: `color-mix(in srgb, ${service.color} 15%, transparent)`,
            color: service.color,
          }}
        >
          {service.icon}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {service.name}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {formattedUnits} {service.unitLabel}
          </p>
        </div>
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {formatCurrency(service.costCents)}
      </p>
    </motion.div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function UsageStatsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Spend limit bar skeleton */}
      <div className="space-y-2">
        <div className="h-4 rounded w-1/3" style={{ background: 'var(--bg-tertiary)' }} />
        <div className="h-2 rounded-full w-full" style={{ background: 'var(--bg-tertiary)' }} />
        <div className="h-3 rounded w-1/4" style={{ background: 'var(--bg-tertiary)' }} />
      </div>
      {/* Service rows skeleton */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg" style={{ background: 'var(--bg-tertiary)' }} />
            <div className="space-y-1">
              <div className="h-4 w-20 rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="h-3 w-16 rounded" style={{ background: 'var(--bg-tertiary)' }} />
            </div>
          </div>
          <div className="h-4 w-12 rounded" style={{ background: 'var(--bg-tertiary)' }} />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyUsageState() {
  return (
    <div className="text-center py-8">
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
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        No usage data yet
      </p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
        API usage will appear here once you start using managed services
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UsageStats({ currentUsage, isLoading }: UsageStatsProps) {
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
          API Usage
        </h3>
        <UsageStatsSkeleton />
      </div>
    );
  }

  if (!currentUsage) {
    return (
      <div
        className="rounded-xl p-5"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          API Usage
        </h3>
        <EmptyUsageState />
      </div>
    );
  }

  const { usage, limits } = currentUsage;
  const serviceUsages = getServiceUsages(usage);
  const hasUsage = usage.totalCostCents > 0;

  // Calculate progress bar color based on percentage
  const getProgressColor = () => {
    if (limits.percentUsed >= 90) return 'var(--error)';
    if (limits.percentUsed >= 75) return 'var(--warning)';
    return 'var(--success)';
  };

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
      <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        API Usage
      </h3>

      {/* Spend Limit Progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Monthly Spend
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(limits.currentSpendCents)} / {formatCurrency(limits.spendLimitCents)}
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(limits.percentUsed, 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: getProgressColor() }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {limits.percentUsed}% used
          </span>
          {limits.isAtLimit && (
            <span className="text-xs font-medium" style={{ color: 'var(--error)' }}>
              Limit reached
            </span>
          )}
        </div>
      </div>

      {/* Service Breakdown */}
      {hasUsage ? (
        <div className="space-y-0">
          {serviceUsages.map((service, index) => (
            <ServiceRow key={service.name} service={service} index={index} />
          ))}
        </div>
      ) : (
        <EmptyUsageState />
      )}

      {/* Total */}
      {hasUsage && (
        <div className="flex items-center justify-between pt-4 mt-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Total this period
          </span>
          <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(usage.totalCostCents)}
          </span>
        </div>
      )}
    </motion.div>
  );
}
