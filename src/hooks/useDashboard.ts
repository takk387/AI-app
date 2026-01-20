/**
 * useDashboard Hook
 *
 * Fetches and manages dashboard data including projects, stats, and filtering.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient, isSupabaseConfigured } from '@/utils/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectDocumentationService } from '@/services/ProjectDocumentationService';
import type { ProjectDocumentation } from '@/types/projectDocumentation';
import {
  DashboardStats,
  FilterState,
  ProjectCardData,
  ActivityItem,
  UseDashboardReturn,
  DEFAULT_FILTER_STATE,
} from '@/types/dashboard';

/**
 * Transform ProjectDocumentation to ProjectCardData
 */
function transformToCardData(doc: ProjectDocumentation): ProjectCardData {
  const featureCount = doc.conceptSnapshot?.features?.length ?? 0;
  const totalPhases = doc.stats?.totalPhases ?? 0;
  const completedPhases = doc.stats?.completedPhases ?? 0;
  const progress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

  return {
    id: doc.id,
    appId: doc.appId,
    name: doc.projectName || 'Untitled Project',
    description: doc.projectDescription || doc.conceptSnapshot?.description || '',
    status: doc.buildStatus,
    updatedAt: doc.updatedAt,
    createdAt: doc.createdAt,
    featureCount,
    progress,
    previewImage: doc.layoutSnapshot?.previewImageUrl,
    tags: doc.tags,
  };
}

/**
 * Calculate dashboard stats from projects
 */
function calculateStats(projects: ProjectDocumentation[]): DashboardStats {
  const completed = projects.filter((p) => p.buildStatus === 'completed').length;
  const inProgress = projects.filter((p) =>
    ['planning', 'ready', 'building'].includes(p.buildStatus)
  ).length;
  const totalTokens = projects.reduce((sum, p) => sum + (p.stats?.totalTokensUsed ?? 0), 0);

  return {
    totalProjects: projects.length,
    completedBuilds: completed,
    inProgress,
    savedTemplates: 0, // Will be populated when templates are implemented
    totalTokensUsed: totalTokens,
  };
}

/**
 * Generate activity items from projects
 */
function generateActivity(projects: ProjectDocumentation[]): ActivityItem[] {
  const activities: ActivityItem[] = [];

  for (const project of projects) {
    // Project created
    activities.push({
      id: `${project.id}-created`,
      type: 'project_created',
      projectId: project.id,
      appId: project.appId,
      projectName: project.projectName,
      timestamp: project.createdAt,
    });

    // Build completed or failed
    if (project.buildStatus === 'completed' && project.buildCompletedAt) {
      activities.push({
        id: `${project.id}-completed`,
        type: 'build_completed',
        projectId: project.id,
        appId: project.appId,
        projectName: project.projectName,
        timestamp: project.buildCompletedAt,
        details: `${project.stats?.completedPhases ?? 0} phases completed`,
      });
    } else if (project.buildStatus === 'failed' && project.buildCompletedAt) {
      activities.push({
        id: `${project.id}-failed`,
        type: 'build_failed',
        projectId: project.id,
        appId: project.appId,
        projectName: project.projectName,
        timestamp: project.buildCompletedAt,
      });
    }
  }

  // Sort by timestamp descending
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Return only recent 10
  return activities.slice(0, 10);
}

/**
 * Apply filters to projects
 */
function applyFilters(projects: ProjectCardData[], filters: FilterState): ProjectCardData[] {
  let result = [...projects];

  // Search filter
  if (filters.search.trim()) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
    );
  }

  // Status filter
  if (filters.status !== 'all') {
    result = result.filter((p) => p.status === filters.status);
  }

  // Sort
  result.sort((a, b) => {
    let comparison = 0;
    switch (filters.sortBy) {
      case 'recent':
        comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }
    return filters.sortOrder === 'asc' ? -comparison : comparison;
  });

  return result;
}

/**
 * useDashboard - Main dashboard data hook
 */
export function useDashboard(): UseDashboardReturn {
  const { user } = useAuth();
  const [rawProjects, setRawProjects] = useState<ProjectDocumentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFiltersState] = useState<FilterState>(DEFAULT_FILTER_STATE);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured()) {
      setRawProjects([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const docService = new ProjectDocumentationService(supabase);
      const result = await docService.getByUserId(user.id);

      if (result.success && result.data) {
        setRawProjects(result.data);
      } else {
        setError(new Error(result.error || 'Failed to fetch projects'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Transform projects to card data
  const projects = useMemo(() => rawProjects.map(transformToCardData), [rawProjects]);

  // Calculate stats
  const stats = useMemo(() => calculateStats(rawProjects), [rawProjects]);

  // Generate activity
  const recentActivity = useMemo(() => generateActivity(rawProjects), [rawProjects]);

  // Apply filters
  const filteredProjects = useMemo(() => applyFilters(projects, filters), [projects, filters]);

  // Filter setters
  const setFilters = useCallback((updates: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTER_STATE);
  }, []);

  // Delete project
  const deleteProject = useCallback(
    async (projectId: string) => {
      if (!user?.id || !isSupabaseConfigured()) return;

      try {
        const supabase = createClient();
        const docService = new ProjectDocumentationService(supabase);
        const result = await docService.delete(projectId);

        if (result.success) {
          setRawProjects((prev) => prev.filter((p) => p.id !== projectId));
        } else {
          throw new Error(result.error || 'Failed to delete project');
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        throw err;
      }
    },
    [user?.id]
  );

  // Archive project (update status to paused)
  const archiveProject = useCallback(
    async (projectId: string) => {
      if (!user?.id || !isSupabaseConfigured()) return;

      try {
        const supabase = createClient();
        const docService = new ProjectDocumentationService(supabase);
        const result = await docService.updateBuildStatus(projectId, 'paused');

        if (result.success) {
          setRawProjects((prev) =>
            prev.map((p) => (p.id === projectId ? { ...p, buildStatus: 'paused' as const } : p))
          );
        } else {
          throw new Error(result.error || 'Failed to archive project');
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        throw err;
      }
    },
    [user?.id]
  );

  return {
    projects,
    stats,
    recentActivity,
    isLoading,
    error,
    filters,
    setFilters,
    resetFilters,
    filteredProjects,
    refetch: fetchProjects,
    deleteProject,
    archiveProject,
  };
}
