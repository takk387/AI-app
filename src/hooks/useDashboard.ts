/**
 * useDashboard Hook
 *
 * Fetches and manages dashboard data from the unified generated_apps table.
 * This replaces the previous implementation that used project_documentation table.
 *
 * Dashboard now serves as the single source of truth for all projects.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient, isSupabaseConfigured } from '@/utils/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/types/supabase';
import type { AppConcept } from '@/types/appConcept';
import type { LayoutManifest } from '@/types/schema';
import type { LayoutThumbnail } from '@/types/reviewTypes';
import type { DynamicPhasePlan } from '@/types/dynamicPhases';
import {
  DashboardStats,
  FilterState,
  ProjectCardData,
  ActivityItem,
  UseDashboardReturn,
  DEFAULT_FILTER_STATE,
} from '@/types/dashboard';

type DbGeneratedApp = Database['public']['Tables']['generated_apps']['Row'];

/**
 * Type for the metadata stored in database
 */
interface DbMetadata {
  isFavorite?: boolean;
  timestamp?: string;
  appConcept?: AppConcept | null;
  layoutManifest?: LayoutManifest | null;
  layoutThumbnail?: LayoutThumbnail | null;
  buildStatus?: 'planning' | 'designing' | 'building' | 'complete' | 'deployed';
  dynamicPhasePlan?: DynamicPhasePlan | null;
}

/**
 * Map buildStatus to dashboard BuildStatus type
 */
function mapBuildStatus(
  status?: string
): 'planning' | 'ready' | 'building' | 'completed' | 'failed' | 'paused' {
  switch (status) {
    case 'planning':
      return 'planning';
    case 'designing':
      return 'ready'; // Design phase maps to "ready to build"
    case 'building':
      return 'building';
    case 'complete':
    case 'deployed':
      return 'completed';
    default:
      return 'planning';
  }
}

/**
 * Transform GeneratedComponent (from generated_apps) to ProjectCardData
 */
function transformToCardData(dbApp: DbGeneratedApp): ProjectCardData {
  const metadata = (dbApp.metadata as DbMetadata) || {};
  const appConcept = metadata.appConcept;
  const dynamicPhasePlan = metadata.dynamicPhasePlan;

  // Calculate feature count from appConcept
  const featureCount = appConcept?.coreFeatures?.length ?? 0;

  // Calculate progress from dynamicPhasePlan
  const totalPhases = dynamicPhasePlan?.phases?.length ?? 0;
  const completedPhases =
    dynamicPhasePlan?.phases?.filter((p) => p.status === 'completed').length ?? 0;
  const progress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

  return {
    id: dbApp.id,
    appId: dbApp.id, // Same as id for generated_apps
    name: dbApp.title || 'Untitled Project',
    description: dbApp.description || appConcept?.description || appConcept?.purpose || '',
    status: mapBuildStatus(metadata.buildStatus),
    updatedAt: dbApp.updated_at || dbApp.created_at,
    createdAt: dbApp.created_at,
    featureCount,
    progress,
    previewImage: metadata.layoutThumbnail?.dataUrl,
    tags: [], // Tags not currently stored in generated_apps
  };
}

/**
 * Calculate dashboard stats from projects
 */
function calculateStats(projects: DbGeneratedApp[]): DashboardStats {
  const projectCards = projects.map(transformToCardData);
  const completed = projectCards.filter((p) => p.status === 'completed').length;
  const inProgress = projectCards.filter((p) =>
    ['planning', 'ready', 'building'].includes(p.status)
  ).length;

  return {
    totalProjects: projects.length,
    completedBuilds: completed,
    inProgress,
    savedTemplates: 0, // Will be populated when templates are implemented
    totalTokensUsed: 0, // Token tracking would need to be added to generated_apps
  };
}

/**
 * Generate activity items from projects
 */
function generateActivity(projects: DbGeneratedApp[]): ActivityItem[] {
  const activities: ActivityItem[] = [];

  for (const project of projects) {
    const metadata = (project.metadata as DbMetadata) || {};

    // Project created
    activities.push({
      id: `${project.id}-created`,
      type: 'project_created',
      projectId: project.id,
      appId: project.id,
      projectName: project.title,
      timestamp: project.created_at,
    });

    // Build completed
    if (metadata.buildStatus === 'complete' || metadata.buildStatus === 'deployed') {
      activities.push({
        id: `${project.id}-completed`,
        type: 'build_completed',
        projectId: project.id,
        appId: project.id,
        projectName: project.title,
        timestamp: project.updated_at || project.created_at,
        details: 'Build completed',
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
 *
 * Now fetches from generated_apps table (unified with App Library)
 * Dashboard is the single source of truth for all projects.
 */
export function useDashboard(): UseDashboardReturn {
  const { user } = useAuth();
  const [rawProjects, setRawProjects] = useState<DbGeneratedApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFiltersState] = useState<FilterState>(DEFAULT_FILTER_STATE);

  // Fetch projects from generated_apps table
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
      const { data: dbApps, error: dbError } = await supabase
        .from('generated_apps')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (dbError) {
        throw new Error(dbError.message || 'Failed to fetch projects');
      }

      setRawProjects(dbApps || []);
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

  // Delete project from generated_apps
  const deleteProject = useCallback(
    async (projectId: string) => {
      if (!user?.id || !isSupabaseConfigured()) return;

      try {
        const supabase = createClient();
        const { error: dbError } = await supabase
          .from('generated_apps')
          .delete()
          .eq('id', projectId)
          .eq('user_id', user.id);

        if (dbError) {
          throw new Error(dbError.message || 'Failed to delete project');
        }

        // Update local state
        setRawProjects((prev) => prev.filter((p) => p.id !== projectId));
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        throw err;
      }
    },
    [user?.id]
  );

  // Archive project (set buildStatus to paused)
  const archiveProject = useCallback(
    async (projectId: string) => {
      if (!user?.id || !isSupabaseConfigured()) return;

      try {
        const supabase = createClient();

        // Get current metadata
        const { data: currentApp, error: fetchError } = await supabase
          .from('generated_apps')
          .select('metadata')
          .eq('id', projectId)
          .eq('user_id', user.id)
          .single();

        if (fetchError) {
          throw new Error(fetchError.message || 'Failed to fetch project');
        }

        // Update metadata with paused status
        const currentMetadata = (currentApp?.metadata as DbMetadata) || {};
        const updatedMetadata = {
          ...currentMetadata,
          buildStatus: 'paused' as const,
        };

        const { error: updateError } = await supabase
          .from('generated_apps')
          .update({
            metadata:
              updatedMetadata as unknown as Database['public']['Tables']['generated_apps']['Row']['metadata'],
          })
          .eq('id', projectId)
          .eq('user_id', user.id);

        if (updateError) {
          throw new Error(updateError.message || 'Failed to archive project');
        }

        // Update local state
        setRawProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  metadata:
                    updatedMetadata as unknown as Database['public']['Tables']['generated_apps']['Row']['metadata'],
                }
              : p
          )
        );
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
