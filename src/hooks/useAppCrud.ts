/**
 * useAppCrud Hook
 *
 * Extracted from MainBuilderView.tsx to reduce component size.
 * Handles app CRUD operations:
 * - Create new app
 * - Load app
 * - Delete app
 * - Toggle favorite
 */

import { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { GeneratedComponent, ChatMessage } from '@/types/aiBuilderTypes';
import { logger } from '@/utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for useAppCrud hook
 */
export interface UseAppCrudOptions {
  onSaveComponent: (
    component: GeneratedComponent
  ) => Promise<{ success: boolean; error?: unknown }>;
  onDeleteComponent: (id: string) => Promise<{ success: boolean; error?: unknown }>;
  getWelcomeMessage: () => ChatMessage;
}

/**
 * Return type for useAppCrud hook
 */
export interface UseAppCrudReturn {
  handleNewApp: () => void;
  handleNameAppSubmit: (name: string) => void;
  loadComponent: (comp: GeneratedComponent) => void;
  deleteComponent: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for handling app CRUD operations in MainBuilderView
 */
export function useAppCrud(options: UseAppCrudOptions): UseAppCrudReturn {
  const { onSaveComponent, onDeleteComponent, getWelcomeMessage } = options;

  // Get state and setters from Zustand store
  const {
    components,
    currentComponent,
    setCurrentComponent,
    setComponents,
    addComponent,
    setChatMessages,
    setActiveTab,
    setShowLibrary,
    setShowNameAppModal,
    setNewAppStagePlan,
    setCurrentAppId,
    setDynamicPhasePlan,
    // Setters for restoring wizard data when loading a component
    setAppConcept,
    setCurrentLayoutManifest,
    setLayoutThumbnail,
    // Data from wizard flow (for creating new components)
    appConcept,
    dynamicPhasePlan,
    currentLayoutManifest,
    layoutThumbnail,
    currentAppId,
  } = useAppStore();

  /**
   * Show name app modal to create new app
   */
  const handleNewApp = useCallback(() => {
    setShowNameAppModal(true);
  }, [setShowNameAppModal]);

  /**
   * Create new app with the given name
   * Transfers all wizard data (appConcept, dynamicPhasePlan, layoutManifest) to the GeneratedComponent
   */
  const handleNameAppSubmit = useCallback(
    (name: string) => {
      // Use existing currentAppId from wizard if available, otherwise generate new one
      // This ensures ID consistency between documentation and the app
      const componentId = currentAppId || generateId();

      // Create new GeneratedComponent with wizard data transferred
      const newComponent: GeneratedComponent = {
        id: componentId,
        name: appConcept?.name || name,
        code: '',
        description: appConcept?.description || appConcept?.purpose || '',
        timestamp: new Date().toISOString(),
        isFavorite: false,
        conversationHistory: [],
        versions: [],
        // Transfer all wizard data to the component
        appConcept: appConcept || null,
        dynamicPhasePlan: dynamicPhasePlan || null,
        layoutManifest: currentLayoutManifest || null,
        layoutThumbnail: layoutThumbnail || null,
        // Set initial build status based on what data we have
        buildStatus: appConcept ? (currentLayoutManifest ? 'building' : 'designing') : 'planning',
      };

      // Set as current component and add to library
      setCurrentComponent(newComponent);
      addComponent(newComponent);
      setCurrentAppId(componentId); // Ensure currentAppId is set (may already be set from wizard)
      setChatMessages([getWelcomeMessage()]);
      setActiveTab('chat');
      setShowNameAppModal(false);

      // CRITICAL: Save to database immediately to prevent data loss
      onSaveComponent(newComponent).then((result) => {
        if (!result.success) {
          logger.error('[useAppCrud] Failed to save new component to database', undefined, {
            error: result.error,
          });
        } else {
          logger.info('[useAppCrud] Component saved to database successfully');
        }
      });

      // Store ID for persistence
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('current_app_id', componentId);
        } catch {
          // Failed to save current app ID to localStorage
        }
      }

      // Log successful data transfer for debugging
      logger.info('[useAppCrud] Created component with wizard data', {
        id: componentId,
        hasAppConcept: !!appConcept,
        hasDynamicPhasePlan: !!dynamicPhasePlan,
        hasLayoutManifest: !!currentLayoutManifest,
        hasLayoutThumbnail: !!layoutThumbnail,
      });
    },
    [
      setCurrentComponent,
      addComponent,
      setCurrentAppId,
      setChatMessages,
      setActiveTab,
      setShowNameAppModal,
      getWelcomeMessage,
      onSaveComponent, // CRITICAL: Added to save to database
      // Include wizard data in dependencies
      appConcept,
      dynamicPhasePlan,
      currentLayoutManifest,
      layoutThumbnail,
      currentAppId,
    ]
  );

  /**
   * Load a component from library or dashboard
   * Restores all wizard data (appConcept, layoutManifest, etc.) to Zustand store
   */
  const loadComponent = useCallback(
    (comp: GeneratedComponent) => {
      // Set the component as current
      setCurrentComponent(comp);
      setCurrentAppId(comp.id); // Set currentAppId for deploy flow
      setChatMessages(comp.conversationHistory);
      setShowLibrary(false);
      setActiveTab('preview');

      // Restore stage plan if there are pending phases
      const hasPendingPhases = comp.stagePlan?.phases?.some((p) => p.status === 'pending') ?? false;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      setNewAppStagePlan(hasPendingPhases ? comp.stagePlan! : null);

      // Restore all wizard data to Zustand store for builder access
      setDynamicPhasePlan(comp.dynamicPhasePlan ?? null);
      setAppConcept(comp.appConcept ?? null);
      setCurrentLayoutManifest(comp.layoutManifest ?? null);
      setLayoutThumbnail(comp.layoutThumbnail ?? null);

      // Save to localStorage for refresh persistence
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('current_app_id', comp.id);
        } catch {
          // Failed to save current app ID to localStorage
        }
      }

      // Log successful data restoration for debugging
      logger.info('[useAppCrud] Loaded component with wizard data', {
        id: comp.id,
        hasAppConcept: !!comp.appConcept,
        hasDynamicPhasePlan: !!comp.dynamicPhasePlan,
        hasLayoutManifest: !!comp.layoutManifest,
        hasLayoutThumbnail: !!comp.layoutThumbnail,
        buildStatus: comp.buildStatus,
      });
    },
    [
      setCurrentComponent,
      setCurrentAppId,
      setChatMessages,
      setShowLibrary,
      setActiveTab,
      setNewAppStagePlan,
      setDynamicPhasePlan,
      setAppConcept,
      setCurrentLayoutManifest,
      setLayoutThumbnail,
    ]
  );

  /**
   * Delete a component
   */
  const deleteComponent = useCallback(
    async (id: string) => {
      // Update UI optimistically for good UX
      const updatedComponents = components.filter((comp) => comp.id !== id);
      setComponents(updatedComponents);

      // Immediately update localStorage to ensure sync before any page refresh
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('ai_components', JSON.stringify(updatedComponents));

          // If deleting the currently loaded component, clear its ID from localStorage
          if (currentComponent?.id === id) {
            localStorage.removeItem('current_app_id');
          }
        } catch {
          // Failed to update localStorage after delete
        }
      }

      if (currentComponent?.id === id) {
        setCurrentComponent(null);
        setCurrentAppId(null); // Clear currentAppId when deleting current app
        setChatMessages([getWelcomeMessage()]);
        setActiveTab('chat');
      }

      // Delete from database (await to ensure completion)
      const result = await onDeleteComponent(id);
      if (!result.success) {
        logger.warn(`Failed to delete component ${id} from database`, { error: result.error });
        // Note: UI is already updated. On next login, the component will reappear
        // if the database deletion failed, but this is rare and self-correcting.
      }
    },
    [
      onDeleteComponent,
      components,
      setComponents,
      currentComponent,
      setCurrentComponent,
      setCurrentAppId,
      setChatMessages,
      setActiveTab,
      getWelcomeMessage,
    ]
  );

  /**
   * Toggle favorite status of a component
   */
  const toggleFavorite = useCallback(
    (id: string) => {
      const component = components.find((c) => c.id === id);
      if (!component) return;

      const updatedComponent = { ...component, isFavorite: !component.isFavorite };

      setComponents((prev) => prev.map((comp) => (comp.id === id ? updatedComponent : comp)));

      onSaveComponent(updatedComponent);
    },
    [components, setComponents, onSaveComponent]
  );

  return {
    handleNewApp,
    handleNameAppSubmit,
    loadComponent,
    deleteComponent,
    toggleFavorite,
  };
}

export default useAppCrud;
