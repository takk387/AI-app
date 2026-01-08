'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { formatRelativeTime, type ActivityItem, type ActivityType } from '@/types/dashboard';

// ============================================================================
// TYPES
// ============================================================================

interface RecentActivityProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  maxItems?: number;
}

interface ActivityConfig {
  icon: React.ReactNode;
  color: string;
  label: string;
}

// ============================================================================
// ACTIVITY CONFIGURATION
// ============================================================================

/**
 * Get activity configuration (icon, color, label) for each activity type
 * Uses CSS variables for theming - no hardcoded colors
 */
function getActivityConfig(type: ActivityType): ActivityConfig {
  switch (type) {
    case 'project_created':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        color: 'var(--info)',
        label: 'Project created',
      };
    case 'build_started':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        color: 'var(--warning)',
        label: 'Build started',
      };
    case 'build_completed':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        color: 'var(--success)',
        label: 'Build completed',
      };
    case 'build_failed':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        color: 'var(--error)',
        label: 'Build failed',
      };
    case 'deployed':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        ),
        color: 'var(--accent-primary)',
        label: 'Deployed',
      };
    case 'exported':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        ),
        color: 'var(--text-secondary)',
        label: 'Exported',
      };
    default:
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        color: 'var(--text-muted)',
        label: 'Activity',
      };
  }
}

// ============================================================================
// ACTIVITY ITEM COMPONENT
// ============================================================================

interface ActivityItemRowProps {
  activity: ActivityItem;
  index: number;
  isLast: boolean;
}

function ActivityItemRow({ activity, index, isLast }: ActivityItemRowProps) {
  const router = useRouter();
  const config = getActivityConfig(activity.type);

  const handleProjectClick = () => {
    router.push(`/app/builder?appId=${activity.appId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative flex gap-4"
    >
      {/* Timeline line */}
      {!isLast && (
        <div
          className="absolute left-[15px] top-8 w-0.5 h-[calc(100%-8px)]"
          style={{ background: 'var(--border-color)' }}
        />
      )}

      {/* Icon */}
      <div
        className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          background: `color-mix(in srgb, ${config.color} 15%, transparent)`,
          color: config.color,
        }}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {config.label}
          </span>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            &middot;
          </span>
          <button
            type="button"
            onClick={handleProjectClick}
            className="text-sm font-medium truncate max-w-[200px] transition-colors"
            style={{ color: 'var(--accent-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
          >
            {activity.projectName}
          </button>
        </div>

        {activity.details && (
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            {activity.details}
          </p>
        )}

        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {formatRelativeTime(activity.timestamp)}
        </p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full"
            style={{ background: 'var(--bg-tertiary)' }}
          />
          <div className="flex-1 space-y-2">
            <div className="h-4 rounded w-3/4" style={{ background: 'var(--bg-tertiary)' }} />
            <div className="h-3 rounded w-1/2" style={{ background: 'var(--bg-tertiary)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyActivityState() {
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
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        No recent activity
      </p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
        Your project activity will appear here
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RecentActivity({ activities, isLoading, maxItems = 5 }: RecentActivityProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-xl p-5"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <ActivitySkeleton />
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return <EmptyActivityState />;
  }

  const displayActivities = activities.slice(0, maxItems);

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div className="space-y-0">
        {displayActivities.map((activity, index) => (
          <ActivityItemRow
            key={activity.id}
            activity={activity}
            index={index}
            isLast={index === displayActivities.length - 1}
          />
        ))}
      </div>

      {activities.length > maxItems && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button
            type="button"
            className="text-sm font-medium w-full text-center py-2 rounded-lg transition-colors"
            style={{ color: 'var(--accent-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            View all activity
          </button>
        </div>
      )}
    </div>
  );
}
