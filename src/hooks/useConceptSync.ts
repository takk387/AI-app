'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import type { AppConcept, Feature, TechnicalRequirements, UIPreferences } from '@/types/appConcept';

/**
 * Wizard state structure (from NaturalConversationWizard)
 */
export interface WizardState {
  name?: string;
  description?: string;
  purpose?: string;
  targetUsers?: string;
  features: Feature[];
  technical: Partial<TechnicalRequirements>;
  uiPreferences?: Partial<UIPreferences>;
  roles?: Array<{ name: string; capabilities: string[] }>;
  workflows?: Array<{
    name: string;
    description?: string;
    steps: string[];
    involvedRoles: string[];
  }>;
  isComplete: boolean;
  readyForPhases?: boolean;
}

interface UseConceptSyncOptions {
  /** External wizard state to sync from */
  wizardState?: WizardState | null;
  /** Callback when wizard state should be updated */
  onWizardStateUpdate?: (updates: Partial<WizardState>) => void;
  /** Whether sync is enabled */
  enabled?: boolean;
}

interface UseConceptSyncReturn {
  /** Current app concept from store */
  appConcept: AppConcept | null;
  /** Update a field in the app concept */
  updateField: (path: string, value: unknown) => void;
  /** Whether edit mode is active */
  isEditing: boolean;
  /** Toggle edit mode */
  setIsEditing: (editing: boolean) => void;
  /** Sync wizard state to app concept in store */
  syncFromWizard: () => void;
  /** Sync app concept to wizard state */
  syncToWizard: () => void;
  /** Convert wizard state to full AppConcept */
  wizardToAppConcept: (state: WizardState) => AppConcept;
}

/**
 * Hook to sync between wizard state and app concept in store
 * Handles bidirectional sync during PLAN mode
 */
export function useConceptSync({
  wizardState,
  onWizardStateUpdate,
  enabled = true,
}: UseConceptSyncOptions = {}): UseConceptSyncReturn {
  const lastSyncRef = useRef<string>('');

  const {
    appConcept,
    setAppConcept,
    updateAppConceptField,
    conceptPanelEditMode,
    setConceptPanelEditMode,
  } = useAppStore(
    useShallow((state) => ({
      appConcept: state.appConcept,
      setAppConcept: state.setAppConcept,
      updateAppConceptField: state.updateAppConceptField,
      conceptPanelEditMode: state.conceptPanelEditMode,
      setConceptPanelEditMode: state.setConceptPanelEditMode,
    }))
  );

  /**
   * Convert WizardState to full AppConcept
   */
  const wizardToAppConcept = useCallback((state: WizardState): AppConcept => {
    const now = new Date().toISOString();
    return {
      name: state.name || 'Untitled App',
      description: state.description || '',
      purpose: state.purpose || state.description || '',
      targetUsers: state.targetUsers || 'General users',
      coreFeatures: state.features.map((f, i) => ({
        id: f.id || `feature-${i}`,
        name: f.name,
        description: f.description || '',
        priority: f.priority || 'medium',
      })),
      uiPreferences: {
        style: 'modern',
        colorScheme: 'auto',
        layout: 'single-page',
        ...state.uiPreferences,
      } as UIPreferences,
      technical: {
        needsAuth: false,
        needsDatabase: false,
        needsAPI: false,
        needsFileUpload: false,
        needsRealtime: false,
        ...state.technical,
      } as TechnicalRequirements,
      roles: state.roles?.map((r) => ({
        name: r.name,
        capabilities: r.capabilities,
      })),
      workflows: state.workflows?.map((w) => ({
        name: w.name,
        description: w.description,
        steps: w.steps,
        involvedRoles: w.involvedRoles,
      })),
      createdAt: now,
      updatedAt: now,
    };
  }, []);

  /**
   * Sync wizard state to app concept in store
   */
  const syncFromWizard = useCallback(() => {
    if (!wizardState || !enabled) return;

    // Create hash to detect changes
    const hash = JSON.stringify({
      name: wizardState.name,
      description: wizardState.description,
      features: wizardState.features.length,
      technical: wizardState.technical,
    });

    // Skip if no changes
    if (hash === lastSyncRef.current) return;
    lastSyncRef.current = hash;

    const concept = wizardToAppConcept(wizardState);
    setAppConcept(concept);
  }, [wizardState, enabled, wizardToAppConcept, setAppConcept]);

  /**
   * Sync app concept changes back to wizard state
   */
  const syncToWizard = useCallback(() => {
    if (!appConcept || !onWizardStateUpdate || !enabled) return;

    const updates: Partial<WizardState> = {
      name: appConcept.name,
      description: appConcept.description,
      purpose: appConcept.purpose,
      targetUsers: appConcept.targetUsers,
      features: appConcept.coreFeatures,
      technical: appConcept.technical,
      uiPreferences: appConcept.uiPreferences,
      roles: appConcept.roles?.map((r) => ({
        name: r.name,
        capabilities: r.capabilities,
      })),
      workflows: appConcept.workflows,
    };

    onWizardStateUpdate(updates);
  }, [appConcept, onWizardStateUpdate, enabled]);

  /**
   * Update a field and optionally sync to wizard
   */
  const updateField = useCallback(
    (path: string, value: unknown) => {
      updateAppConceptField(path, value);

      // Also update wizard state if callback provided
      if (onWizardStateUpdate && enabled) {
        // Map concept paths to wizard paths
        const wizardPath = path.replace('coreFeatures', 'features');
        const keys = wizardPath.split('.');

        if (keys.length === 1) {
          onWizardStateUpdate({ [keys[0]]: value } as Partial<WizardState>);
        }
        // For nested paths, let the parent component handle the update
      }
    },
    [updateAppConceptField, onWizardStateUpdate, enabled]
  );

  // Auto-sync from wizard when it changes
  useEffect(() => {
    if (wizardState && enabled) {
      syncFromWizard();
    }
  }, [wizardState, enabled, syncFromWizard]);

  return {
    appConcept,
    updateField,
    isEditing: conceptPanelEditMode,
    setIsEditing: setConceptPanelEditMode,
    syncFromWizard,
    syncToWizard,
    wizardToAppConcept,
  };
}

export default useConceptSync;
