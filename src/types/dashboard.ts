/**
 * Dashboard Types
 *
 * Types for the user dashboard displaying projects, stats, and deployment status.
 */

import type { BuildStatus } from './projectDocumentation';

// ============================================================================
// DASHBOARD STATS
// ============================================================================

/**
 * Aggregate statistics for the dashboard
 */
export interface DashboardStats {
  totalProjects: number;
  completedBuilds: number;
  inProgress: number;
  savedTemplates: number;
  totalTokensUsed: number;
}

// ============================================================================
// FILTER & SORT
// ============================================================================

/**
 * Filter and sort state for project list
 */
export interface FilterState {
  search: string;
  status: BuildStatus | 'all';
  sortBy: 'recent' | 'name' | 'status';
  sortOrder: 'asc' | 'desc';
  view: 'grid' | 'list';
}

/**
 * Default filter state
 */
export const DEFAULT_FILTER_STATE: FilterState = {
  search: '',
  status: 'all',
  sortBy: 'recent',
  sortOrder: 'desc',
  view: 'grid',
};

// ============================================================================
// PROJECT CARD DATA
// ============================================================================

/**
 * Simplified project data for display in cards
 */
export interface ProjectCardData {
  id: string;
  appId: string;
  name: string;
  description: string;
  status: BuildStatus;
  updatedAt: string;
  createdAt: string;
  featureCount: number;
  progress: number; // 0-100
  previewImage?: string;
  tags?: string[];
}

// ============================================================================
// ACTIVITY
// ============================================================================

/**
 * Activity types for recent activity timeline
 */
export type ActivityType =
  | 'project_created'
  | 'build_started'
  | 'build_completed'
  | 'build_failed'
  | 'deployed'
  | 'exported';

/**
 * Activity item for timeline
 */
export interface ActivityItem {
  id: string;
  type: ActivityType;
  projectId: string;
  appId: string;
  projectName: string;
  timestamp: string;
  details?: string;
}

// ============================================================================
// DASHBOARD HOOK RETURN TYPE
// ============================================================================

/**
 * Return type for useDashboard hook
 */
export interface UseDashboardReturn {
  // Data
  projects: ProjectCardData[];
  stats: DashboardStats;
  recentActivity: ActivityItem[];

  // Loading states
  isLoading: boolean;
  error: Error | null;

  // Filters
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;

  // Filtered results
  filteredProjects: ProjectCardData[];

  // Actions
  refetch: () => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  archiveProject: (projectId: string) => Promise<void>;
}

// ============================================================================
// STATUS HELPERS
// ============================================================================

/**
 * Status display configuration
 */
export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Get status display config
 */
export function getStatusConfig(status: BuildStatus): StatusConfig {
  switch (status) {
    case 'planning':
      return {
        label: 'Planning',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
      };
    case 'ready':
      return {
        label: 'Ready',
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
      };
    case 'building':
      return {
        label: 'Building',
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
      };
    case 'completed':
      return {
        label: 'Completed',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
      };
    case 'failed':
      return {
        label: 'Failed',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
      };
    case 'paused':
      return {
        label: 'Paused',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-50 dark:bg-gray-900/20',
        borderColor: 'border-gray-200 dark:border-gray-800',
      };
    default:
      return {
        label: 'Unknown',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-50 dark:bg-gray-900/20',
        borderColor: 'border-gray-200 dark:border-gray-800',
      };
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}
