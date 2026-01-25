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
  } = useAppStore();

  /**
   * Show name app modal to create new app
   */
  const handleNewApp = useCallback(() => {
    setShowNameAppModal(true);
  }, [setShowNameAppModal]);

  /**
   * Create new app with the given name
   */
  const handleNameAppSubmit = useCallback(
    (name: string) => {
      // Create new GeneratedComponent with the given name
      const newComponent: GeneratedComponent = {
        id: generateId(),
        name: name,
        code: '',
        description: '',
        timestamp: new Date().toISOString(),
        isFavorite: false,
        conversationHistory: [],
        versions: [],
      };

      // Set as current component and add to library
      setCurrentComponent(newComponent);
      addComponent(newComponent);
      setCurrentAppId(newComponent.id); // Set currentAppId for deploy flow
      setChatMessages([getWelcomeMessage()]);
      setActiveTab('chat');
      setShowNameAppModal(false);

      // Store ID for persistence
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('current_app_id', newComponent.id);
        } catch {
          // Failed to save current app ID to localStorage
        }
      }
    },
    [
      setCurrentComponent,
      addComponent,
      setCurrentAppId,
      setChatMessages,
      setActiveTab,
      setShowNameAppModal,
      getWelcomeMessage,
    ]
  );

  /**
   * Load a component from library
   */
  const loadComponent = useCallback(
    (comp: GeneratedComponent) => {
      setCurrentComponent(comp);
      setCurrentAppId(comp.id); // Set currentAppId for deploy flow
      setChatMessages(comp.conversationHistory);
      setShowLibrary(false);
      setActiveTab('preview');
      const hasPendingPhases = comp.stagePlan?.phases?.some((p) => p.status === 'pending') ?? false;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      setNewAppStagePlan(hasPendingPhases ? comp.stagePlan! : null);

      // Restore dynamic phase plan to store for build resumption
      setDynamicPhasePlan(comp.dynamicPhasePlan ?? null);

      // Save to localStorage for refresh persistence
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('current_app_id', comp.id);
        } catch {
          // Failed to save current app ID to localStorage
        }
      }
    },
    [
      setCurrentComponent,
      setCurrentAppId,
      setChatMessages,
      setShowLibrary,
      setActiveTab,
      setNewAppStagePlan,
      setDynamicPhasePlan,
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
        console.warn(`Failed to delete component ${id} from database:`, result.error);
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
