/**
 * useDatabaseSync Hook - Handles Supabase database operations for saving/loading components
 *
 * Extracted from MainBuilderView.tsx for reusability and better separation of concerns.
 * Provides functionality to save, delete, and load generated components from Supabase.
 */

import { useState, useCallback } from 'react';
import { createClient, isSupabaseConfigured } from '@/utils/supabase/client';
import type { Database } from '@/types/supabase';
import type {
  GeneratedComponent,
  ChatMessage,
  AppVersion,
  StagePlan,
  AppBranch,
} from '@/types/aiBuilderTypes';
import { migrateToBranchFormat } from '@/utils/branchMigration';

type DbGeneratedApp = Database['public']['Tables']['generated_apps']['Row'];
type DbGeneratedAppInsert = Database['public']['Tables']['generated_apps']['Insert'];

/**
 * Type for the metadata stored in database
 */
interface DbMetadata {
  isFavorite?: boolean;
  conversationHistory?: ChatMessage[];
  versions?: AppVersion[];
  timestamp?: string;
  stagePlan?: StagePlan | null;
  branches?: AppBranch[];
  activeBranchId?: string;
}

/**
 * Options for useDatabaseSync hook
 */
export interface UseDatabaseSyncOptions {
  /** Current authenticated user ID */
  userId: string | null;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /** Callback when operation succeeds */
  onSuccess?: () => void;
}

/**
 * Return type for useDatabaseSync hook
 */
export interface UseDatabaseSyncReturn {
  /** Save a component to the database */
  saveComponent: (component: GeneratedComponent) => Promise<{ success: boolean; error?: unknown }>;
  /** Delete a component from the database */
  deleteComponent: (componentId: string) => Promise<{ success: boolean; error?: unknown }>;
  /** Load all components from the database */
  loadComponents: () => Promise<GeneratedComponent[]>;
  /** Whether a database operation is in progress */
  isLoading: boolean;
  /** Current error message, if any */
  error: string | null;
  /** Clear the current error */
  clearError: () => void;
}

/**
 * Convert a GeneratedComponent to database insert format
 */
function componentToDb(component: GeneratedComponent, userId: string): DbGeneratedAppInsert {
  return {
    id: component.id,
    user_id: userId,
    title: component.name,
    description: component.description,
    code: component.code,
    metadata: {
      isFavorite: component.isFavorite,
      conversationHistory: component.conversationHistory,
      versions: component.versions || [],
      timestamp: component.timestamp,
      stagePlan: component.stagePlan || null,
      branches: component.branches || [],
      activeBranchId: component.activeBranchId,
    } as unknown as Database['public']['Tables']['generated_apps']['Row']['metadata'],
    is_public: component.isPublic ?? false,
    preview_slug: component.previewSlug || null,
    preview_enabled: component.previewEnabled ?? true,
    version: (component.versions?.length || 0) + 1,
  };
}

/**
 * Convert a database row to GeneratedComponent format
 * Applies branch migration for legacy apps without branches
 */
function dbToComponent(dbApp: DbGeneratedApp): GeneratedComponent {
  const metadata = (dbApp.metadata as DbMetadata) || {};

  const component: GeneratedComponent = {
    id: dbApp.id,
    name: dbApp.title,
    code: dbApp.code,
    description: dbApp.description || '',
    timestamp: metadata.timestamp || dbApp.created_at,
    isFavorite: metadata.isFavorite || false,
    conversationHistory: metadata.conversationHistory || [],
    versions: metadata.versions || [],
    stagePlan: metadata.stagePlan ?? null,
    previewSlug: dbApp.preview_slug || null,
    previewEnabled: dbApp.preview_enabled ?? true,
    isPublic: dbApp.is_public ?? false,
    branches: metadata.branches,
    activeBranchId: metadata.activeBranchId,
  };

  // Migrate to branch format if no branches exist
  return migrateToBranchFormat(component);
}

/**
 * Hook for managing database synchronization of generated components
 *
 * @param options - Configuration options
 * @returns Database sync methods and state
 *
 * @example
 * ```tsx
 * const { saveComponent, deleteComponent, loadComponents, isLoading, error } = useDatabaseSync({
 *   userId: user?.id || null,
 *   onError: (msg) => console.error(msg),
 * });
 * ```
 */
export function useDatabaseSync(options: UseDatabaseSyncOptions): UseDatabaseSyncReturn {
  const { userId, onError, onSuccess } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Save a component to the database
   */
  const saveComponent = useCallback(
    async (component: GeneratedComponent): Promise<{ success: boolean; error?: unknown }> => {
      if (!userId || !isSupabaseConfigured()) {
        // User not authenticated or Supabase not configured - skip database save
        return { success: true };
      }

      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const dbData = componentToDb(component, userId);

        // Upsert without onConflict parameter - let Supabase handle it automatically
        const { error: dbError } = await supabase.from('generated_apps').upsert(dbData);

        if (dbError) {
          console.error('Error saving to database:', dbError);
          const errorMessage = `Failed to save "${component.name}" to database`;
          setError(errorMessage);
          onError?.(errorMessage);
          return { success: false, error: dbError };
        }

        // Clear any previous errors
        setError(null);
        onSuccess?.();
        return { success: true };
      } catch (err) {
        console.error('Error in saveComponent:', err);
        const errorMessage = 'Failed to save to database';
        setError(errorMessage);
        onError?.(errorMessage);
        return { success: false, error: err };
      } finally {
        setIsLoading(false);
      }
    },
    [userId, onError, onSuccess]
  );

  /**
   * Delete a component from the database
   */
  const deleteComponent = useCallback(
    async (componentId: string): Promise<{ success: boolean; error?: unknown }> => {
      if (!userId || !isSupabaseConfigured()) {
        // User not authenticated or Supabase not configured - skip database delete
        return { success: true };
      }

      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { error: dbError } = await supabase
          .from('generated_apps')
          .delete()
          .eq('id', componentId)
          .eq('user_id', userId); // Ensure user can only delete their own apps

        if (dbError) {
          console.error('Error deleting from database:', dbError);
          const errorMessage = 'Failed to delete from database';
          setError(errorMessage);
          onError?.(errorMessage);
          return { success: false, error: dbError };
        }

        // Clear any previous errors
        setError(null);
        onSuccess?.();
        return { success: true };
      } catch (err) {
        console.error('Error in deleteComponent:', err);
        const errorMessage = 'Failed to delete from database';
        setError(errorMessage);
        onError?.(errorMessage);
        return { success: false, error: err };
      } finally {
        setIsLoading(false);
      }
    },
    [userId, onError, onSuccess]
  );

  /**
   * Load all components from the database
   */
  const loadComponents = useCallback(async (): Promise<GeneratedComponent[]> => {
    if (!userId || !isSupabaseConfigured()) {
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: dbApps, error: dbError } = await supabase
        .from('generated_apps')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (dbError) {
        console.error('Error loading apps from database:', dbError);
        const errorMessage = 'Failed to load apps from database';
        setError(errorMessage);
        onError?.(errorMessage);
        return [];
      }

      // Convert database apps to component format
      const components = (dbApps || []).map(dbToComponent);
      onSuccess?.();
      return components;
    } catch (err) {
      console.error('Error in loadComponents:', err);
      const errorMessage = 'Failed to load apps';
      setError(errorMessage);
      onError?.(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [userId, onError, onSuccess]);

  return {
    saveComponent,
    deleteComponent,
    loadComponents,
    isLoading,
    error,
    clearError,
  };
}

export default useDatabaseSync;
