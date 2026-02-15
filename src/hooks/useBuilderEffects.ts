/**
 * useBuilderEffects - Data loading, app restoration, auto-save, localStorage persistence
 *
 * Extracted from MainBuilderView.tsx for modular architecture.
 * Contains all useEffect blocks for:
 * - Clearing actions on mode change
 * - setIsClient
 * - Loading apps from DB
 * - URL/localStorage app restoration
 * - Pending deploy redirect
 * - Wizard redirect
 * - Debounced auto-save
 * - localStorage persistence/restore for UI state and wizard state
 */

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import type { AppConcept } from '@/types/appConcept';
import type { ChatMessage, GeneratedComponent, ActiveTab } from '../types/aiBuilderTypes';
import type { WizardState } from '@/hooks';

// Re-export toImplementationPlanSnapshot for use
import { toImplementationPlanSnapshot } from '@/types/aiBuilderTypes';

export interface UseBuilderEffectsOptions {
  currentMode: string;
  clearSuggestedActions: () => void;
  setIsClient: (value: boolean) => void;
  loadComponentsFromDb: () => Promise<GeneratedComponent[]>;
  setComponents: (fn: ((prev: GeneratedComponent[]) => GeneratedComponent[]) | GeneratedComponent[]) => void;
  setLoadingApps: (value: boolean) => void;
  loadingApps: boolean;
  components: GeneratedComponent[];
  currentComponent: GeneratedComponent | null;
  loadComponent: (comp: GeneratedComponent) => void;
  pendingDeployAfterSave: boolean;
  setPendingDeployAfterSave: (value: boolean) => void;
  currentAppId: string | null;
  appConcept: AppConcept | null;
  dynamicPhasePlan: any;
  isGenerating: boolean;
  chatMessages: ChatMessage[];
  implementationPlan: any;
  saveComponentToDb: (component: GeneratedComponent) => Promise<any>;
  setCurrentComponent: (component: GeneratedComponent | null) => void;
  activeTab: string;
  setActiveTab: (tab: ActiveTab) => void;
  userInput: string;
  setUserInput: (value: string) => void;
  uploadedImage: string | null;
  setUploadedImage: (image: string | null) => void;
  wizardState: WizardState;
  setWizardState: (state: WizardState) => void;
}

export function useBuilderEffects(options: UseBuilderEffectsOptions): void {
  const {
    currentMode,
    clearSuggestedActions,
    setIsClient,
    loadComponentsFromDb,
    setComponents,
    setLoadingApps,
    loadingApps,
    components,
    currentComponent,
    loadComponent,
    pendingDeployAfterSave,
    setPendingDeployAfterSave,
    currentAppId,
    appConcept,
    dynamicPhasePlan,
    isGenerating,
    chatMessages,
    implementationPlan,
    saveComponentToDb,
    setCurrentComponent,
    activeTab,
    setActiveTab,
    userInput,
    setUserInput,
    uploadedImage,
    setUploadedImage,
    wizardState,
    setWizardState,
  } = options;

  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionReady, user } = useAuth();

  // Get layout manifest from store for auto-save sync
  const currentLayoutManifest = useAppStore((state) => state.currentLayoutManifest);
  const layoutThumbnail = useAppStore((state) => state.layoutThumbnail);

  // Refs for debounced auto-save
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<{
    chatLength: number;
    code: string;
    phasePlanId: string | null;
    hasImplPlan: boolean;
    appConceptUpdatedAt: string | null;
    layoutManifestId: string | null;
  } | null>(null);

  // Track if there are unsaved changes for beforeunload protection
  const hasUnsavedChangesRef = useRef(false);

  // Clear suggested actions when switching to ACT mode
  useEffect(() => {
    if (currentMode === 'ACT') {
      clearSuggestedActions();
    }
  }, [currentMode, clearSuggestedActions]);

  useEffect(() => {
    setIsClient(true);
  }, [setIsClient]);

  // Load components on auth ready
  useEffect(() => {
    const loadApps = async () => {
      if (sessionReady && user?.id) {
        setLoadingApps(true);
        try {
          const apps = await loadComponentsFromDb();
          setComponents(apps);
          if (apps.length === 0) {
            console.warn('[MainBuilderView] No apps loaded from database. User may need to create a new app.');
          }
        } catch (err) {
          console.error('[MainBuilderView] Failed to load apps from database:', err);
        } finally {
          setLoadingApps(false);
        }
      }
    };
    loadApps();
  }, [sessionReady, user?.id, loadComponentsFromDb, setComponents, setLoadingApps]);

  // Restore active app from URL param or localStorage after components load
  useEffect(() => {
    // Wait for components to finish loading
    if (loadingApps || components.length === 0) return;
    // Don't override if user already has a component loaded
    if (currentComponent) return;

    // Priority 1: Check URL for appId param (from dashboard navigation)
    const urlAppId = searchParams.get('appId');
    if (urlAppId) {
      const matchingComponent = components.find((c) => c.id === urlAppId);
      if (matchingComponent) {
        loadComponent(matchingComponent);
        // Also save to localStorage for refresh persistence
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('current_app_id', urlAppId);
          } catch {
            // Failed to save to localStorage
          }
        }
        return;
      }
    }

    // Priority 2: Check localStorage for previously active app
    if (typeof window !== 'undefined') {
      try {
        const storedAppId = localStorage.getItem('current_app_id');
        if (storedAppId) {
          const matchingComponent = components.find((c) => c.id === storedAppId);
          if (matchingComponent) {
            loadComponent(matchingComponent);
          } else {
            // Stale app ID - component no longer exists, clear localStorage
            localStorage.removeItem('current_app_id');
          }
        }
      } catch {
        // Failed to read from localStorage
      }
    }
  }, [loadingApps, components, currentComponent, searchParams, loadComponent]);

  // Handle pending deploy after app is saved
  useEffect(() => {
    if (pendingDeployAfterSave && currentAppId) {
      // App was saved, now redirect to dashboard for deployment
      setPendingDeployAfterSave(false);
      router.push(`/app/dashboard?deploy=${currentAppId}`);
    }
  }, [pendingDeployAfterSave, currentAppId, router]);

  // Redirect to wizard if no app is loaded (after initial load completes)
  // This matches the live server behavior where users go through the guided flow
  useEffect(() => {
    // Skip if URL restoration is in progress
    const urlAppId = searchParams.get('appId');
    if (urlAppId) return;

    // Skip if localStorage restoration is pending (app exists and will be loaded)
    const storedAppId =
      typeof window !== 'undefined' ? localStorage.getItem('current_app_id') : null;
    if (storedAppId && components.length > 0 && components.some((c) => c.id === storedAppId))
      return;

    // Skip if user has gone through the guided flow (has concept or plan in store)
    // This prevents the redirect when the database query fails but the user
    // navigated here intentionally from the wizard → design → review flow
    if (appConcept || dynamicPhasePlan) return;

    // Wait for session to be ready and initial app load to complete
    // Redirect to wizard for guided flow instead of showing name modal
    if (sessionReady && !loadingApps && !currentComponent) {
      router.push('/app/wizard');
    }
  }, [sessionReady, loadingApps, currentComponent, searchParams, components, router, appConcept, dynamicPhasePlan]);

  // Debounced auto-save for chat messages, code changes, phase plans, AND wizard data (2000ms)
  // This ensures that modifications to appConcept, layoutManifest, etc. are persisted
  useEffect(() => {
    // Don't auto-save if no component is loaded or if still loading
    if (!currentComponent || loadingApps || isGenerating) return;

    // Skip if nothing has changed since last save (including wizard data)
    const currentState = {
      chatLength: chatMessages.length,
      code: currentComponent.code,
      phasePlanId: dynamicPhasePlan?.id ?? null,
      hasImplPlan: !!implementationPlan,
      appConceptUpdatedAt: appConcept?.updatedAt ?? null,
      layoutManifestId: currentLayoutManifest?.id ?? null,
    };
    if (
      lastSavedRef.current &&
      lastSavedRef.current.chatLength === currentState.chatLength &&
      lastSavedRef.current.code === currentState.code &&
      lastSavedRef.current.phasePlanId === currentState.phasePlanId &&
      lastSavedRef.current.hasImplPlan === currentState.hasImplPlan &&
      lastSavedRef.current.appConceptUpdatedAt === currentState.appConceptUpdatedAt &&
      lastSavedRef.current.layoutManifestId === currentState.layoutManifestId
    ) {
      return;
    }

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set up debounced save (2000ms)
    autoSaveTimerRef.current = setTimeout(async () => {
      // Convert runtime implementation plan to snapshot for DB persistence
      const implPlanSnapshot = implementationPlan
        ? toImplementationPlanSnapshot(implementationPlan)
        : currentComponent.implementationPlan;

      // CRITICAL FIX: Sync ALL store state (including wizard data) to component before saving
      // This ensures appConcept, layoutManifest, layoutThumbnail modifications are persisted
      const updatedComponent = {
        ...currentComponent,
        conversationHistory: chatMessages,
        dynamicPhasePlan: dynamicPhasePlan ?? currentComponent.dynamicPhasePlan,
        implementationPlan: implPlanSnapshot,
        // Sync wizard/design data from store
        appConcept: appConcept ?? currentComponent.appConcept,
        layoutManifest: currentLayoutManifest ?? currentComponent.layoutManifest,
        layoutThumbnail: layoutThumbnail ?? currentComponent.layoutThumbnail,
        // Update build status based on what data we have
        buildStatus: appConcept
          ? currentLayoutManifest
            ? currentComponent.code
              ? 'building'
              : 'designing'
            : 'planning'
          : currentComponent.buildStatus,
      };

      // Update store with synced component
      setCurrentComponent(updatedComponent);
      setComponents((prev: GeneratedComponent[]) =>
        prev.map((comp) => (comp.id === currentComponent.id ? updatedComponent : comp))
      );

      await saveComponentToDb(updatedComponent);
      lastSavedRef.current = currentState;
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    chatMessages,
    currentComponent,
    loadingApps,
    isGenerating,
    saveComponentToDb,
    dynamicPhasePlan,
    implementationPlan,
    appConcept,
    currentLayoutManifest,
    layoutThumbnail,
    setCurrentComponent,
    setComponents,
  ]);

  // Persist UI state to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('ai_builder_active_tab', activeTab);
    } catch {
      // Failed to save UI state
    }
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('ai_builder_user_input', userInput);
    } catch {
      // Failed to save user input
    }
  }, [userInput]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (uploadedImage) {
        localStorage.setItem('ai_builder_uploaded_image', uploadedImage);
      } else {
        localStorage.removeItem('ai_builder_uploaded_image');
      }
    } catch {
      // Failed to save uploaded image
    }
  }, [uploadedImage]);

  // Restore UI state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedTab = localStorage.getItem('ai_builder_active_tab');
      if (savedTab && (savedTab === 'chat' || savedTab === 'preview' || savedTab === 'code')) {
        setActiveTab(savedTab);
      }

      const savedInput = localStorage.getItem('ai_builder_user_input');
      if (savedInput) {
        setUserInput(savedInput);
      }

      const savedImage = localStorage.getItem('ai_builder_uploaded_image');
      if (savedImage) {
        setUploadedImage(savedImage);
      }
    } catch {
      // Failed to restore UI state
    }
  }, [setActiveTab, setUserInput, setUploadedImage]);

  // Persist wizard state for PLAN mode
  useEffect(() => {
    if (typeof window === 'undefined' || currentMode !== 'PLAN') return;
    try {
      localStorage.setItem('ai_builder_wizard_state', JSON.stringify(wizardState));
    } catch {
      // Failed to save wizard state
    }
  }, [wizardState, currentMode]);

  // Restore wizard state on mount if in PLAN mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedWizardState = localStorage.getItem('ai_builder_wizard_state');
      if (savedWizardState) {
        const parsed = JSON.parse(savedWizardState);
        setWizardState(parsed);
      }
    } catch {
      // Failed to restore wizard state
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
