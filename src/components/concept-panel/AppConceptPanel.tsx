'use client';

import { useCallback, useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  EyeIcon,
  SparklesIcon,
} from '@/components/ui/Icons';
import type { AppConcept } from '@/types/appConcept';
import type { DynamicPhase, DynamicPhasePlan } from '@/types/dynamicPhases';
import type { BuildPhase, BuildProgress } from '@/types/buildPhases';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { PhaseDetailView } from '@/components/build';
import { adaptDynamicPhaseToUI } from '@/types/phaseAdapters';
import {
  BasicInfoSection,
  FeaturesSection,
  UIPreferencesSection,
  TechnicalSection,
  RolesSection,
  WorkflowsSection,
  PhasePlanSection,
} from './sections';

/**
 * Build state from useDynamicBuildPhases hook
 */
export interface BuildState {
  uiPhases: BuildPhase[];
  dynamicPhases: DynamicPhase[];
  progress: BuildProgress;
  isBuilding: boolean;
  isPaused: boolean;
  currentPhase: DynamicPhase | null;
}

interface AppConceptPanelProps {
  appConcept: AppConcept | null;
  phasePlan?: DynamicPhasePlan | null;
  completedPhases?: string[];
  currentPhase?: string;
  mode: 'plan' | 'act';
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onConceptUpdate?: (path: string, value: unknown) => void;
  onStartBuilding?: () => void;

  // NEW: Build state from useDynamicBuildPhases
  buildState?: BuildState;

  // NEW: Build action callbacks
  onPauseBuild?: () => void;
  onResumeBuild?: () => void;
  onSkipPhase?: (phaseNumber: number) => void;
  onRetryPhase?: (phaseNumber: number) => void;
}

/**
 * Main App Concept Panel component
 * Displays comprehensive AppConcept with inline editing
 * Positioned between Chat and Preview panels
 */
export function AppConceptPanel({
  appConcept,
  phasePlan,
  completedPhases = [],
  currentPhase,
  mode,
  isCollapsed,
  onToggleCollapse,
  onConceptUpdate,
  onStartBuilding,
  buildState,
  onPauseBuild,
  onResumeBuild,
  onSkipPhase,
  onRetryPhase,
}: AppConceptPanelProps) {
  const { conceptPanelEditMode, setConceptPanelEditMode, updateAppConceptField } = useAppStore(
    useShallow((state) => ({
      conceptPanelEditMode: state.conceptPanelEditMode,
      setConceptPanelEditMode: state.setConceptPanelEditMode,
      updateAppConceptField: state.updateAppConceptField,
    }))
  );

  // State for phase detail modal
  const [selectedPhaseNumber, setSelectedPhaseNumber] = useState<number | null>(null);

  // Get selected phase data for modal
  const selectedDynamicPhase =
    selectedPhaseNumber !== null
      ? (buildState?.dynamicPhases.find((p) => p.number === selectedPhaseNumber) ?? null)
      : null;
  const selectedUiPhase = selectedDynamicPhase ? adaptDynamicPhaseToUI(selectedDynamicPhase) : null;

  // Handler for phase click
  const handlePhaseClick = useCallback((phaseNumber: number) => {
    setSelectedPhaseNumber(phaseNumber);
  }, []);

  // Handler for closing phase detail modal
  const handleClosePhaseDetail = useCallback(() => {
    setSelectedPhaseNumber(null);
  }, []);

  // Handle field updates - use provided callback or store action
  const handleUpdate = useCallback(
    (path: string, value: unknown) => {
      if (onConceptUpdate) {
        onConceptUpdate(path, value);
      } else {
        updateAppConceptField(path, value);
      }
    },
    [onConceptUpdate, updateAppConceptField]
  );

  // Determine if editing is allowed
  const isReadOnly = mode === 'act' && !conceptPanelEditMode;

  // Collapsed state - show toggle bar
  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="w-10 h-full bg-zinc-900/80 border-x border-zinc-800 flex flex-col items-center justify-center gap-2 hover:bg-zinc-800/80 transition-colors group"
        title="Show App Concept"
      >
        <ChevronRightIcon
          size={16}
          className="text-zinc-500 group-hover:text-zinc-300 transition-colors"
        />
        <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400 transition-colors [writing-mode:vertical-lr] rotate-180">
          App Concept
        </span>
        {appConcept && (
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" title="Concept loaded" />
        )}
      </button>
    );
  }

  // Empty state
  if (!appConcept) {
    return (
      <div className="h-full flex flex-col bg-zinc-900/50 border-x border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <SparklesIcon size={16} className="text-blue-400" />
            <h2 className="text-sm font-medium text-zinc-200">App Concept</h2>
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Collapse panel"
          >
            <ChevronLeftIcon size={16} />
          </button>
        </div>

        {/* Empty content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <SparklesIcon size={32} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No concept yet</p>
            <p className="text-xs text-zinc-600 mt-1">
              Start planning your app in the chat to see the concept here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900/50 border-x border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <SparklesIcon size={16} className="text-blue-400" />
          <h2 className="text-sm font-medium text-zinc-200">App Concept</h2>
          {mode === 'act' && (
            <span className="px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded">
              Building
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Edit mode toggle (only in ACT mode) */}
          {mode === 'act' && (
            <button
              onClick={() => setConceptPanelEditMode(!conceptPanelEditMode)}
              className={`p-1.5 rounded transition-colors ${
                conceptPanelEditMode
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title={conceptPanelEditMode ? 'View mode' : 'Edit mode'}
            >
              {conceptPanelEditMode ? <PencilIcon size={14} /> : <EyeIcon size={14} />}
            </button>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Collapse panel"
          >
            <ChevronLeftIcon size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Basic Info */}
          <BasicInfoSection appConcept={appConcept} onUpdate={handleUpdate} readOnly={isReadOnly} />

          {/* Divider */}
          <div className="border-t border-zinc-800" />

          {/* Features */}
          <FeaturesSection appConcept={appConcept} onUpdate={handleUpdate} readOnly={isReadOnly} />

          {/* Divider */}
          <div className="border-t border-zinc-800" />

          {/* UI Preferences */}
          <UIPreferencesSection
            appConcept={appConcept}
            onUpdate={handleUpdate}
            readOnly={isReadOnly}
          />

          {/* Divider */}
          <div className="border-t border-zinc-800" />

          {/* Technical Requirements */}
          <TechnicalSection appConcept={appConcept} onUpdate={handleUpdate} readOnly={isReadOnly} />

          {/* Roles (if any) - conditionally render with divider */}
          {(appConcept.roles?.length || !isReadOnly) && (
            <>
              <div className="border-t border-zinc-800" />
              <RolesSection appConcept={appConcept} onUpdate={handleUpdate} readOnly={isReadOnly} />
            </>
          )}

          {/* Workflows (if any) - conditionally render with divider */}
          {(appConcept.workflows?.length || !isReadOnly) && (
            <>
              <div className="border-t border-zinc-800" />
              <WorkflowsSection
                appConcept={appConcept}
                onUpdate={handleUpdate}
                readOnly={isReadOnly}
              />
            </>
          )}

          {/* Phase Plan (if generated) */}
          {phasePlan && (
            <>
              <div className="border-t border-zinc-800" />
              <PhasePlanSection
                phasePlan={phasePlan}
                completedPhases={completedPhases}
                currentPhase={currentPhase}
                mode={mode}
                buildState={buildState}
                onPhaseClick={mode === 'act' ? handlePhaseClick : undefined}
              />
            </>
          )}
        </div>
      </div>

      {/* Footer with action button */}
      {mode === 'plan' && phasePlan && onStartBuilding && (
        <div className="p-3 border-t border-zinc-800 flex-shrink-0">
          <button
            onClick={onStartBuilding}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-blue-500/20"
          >
            Start Building
          </button>
        </div>
      )}

      {/* ACT mode footer with build controls */}
      {mode === 'act' && buildState && (
        <div className="p-3 border-t border-zinc-800 flex-shrink-0 space-y-2">
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                style={{ width: `${buildState.progress.percentComplete}%` }}
              />
            </div>
            <span className="text-xs text-zinc-400 min-w-[3rem] text-right">
              {buildState.progress.percentComplete}%
            </span>
          </div>

          {/* Build controls */}
          <div className="flex gap-2">
            {buildState.isBuilding && !buildState.isPaused && onPauseBuild && (
              <button
                onClick={onPauseBuild}
                className="flex-1 py-1.5 px-3 text-xs bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 rounded-lg transition-colors"
              >
                ⏸️ Pause
              </button>
            )}
            {buildState.isPaused && onResumeBuild && (
              <button
                onClick={onResumeBuild}
                className="flex-1 py-1.5 px-3 text-xs bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg transition-colors"
              >
                ▶️ Resume
              </button>
            )}
            {buildState.currentPhase && onSkipPhase && (
              <button
                onClick={() => {
                  const phase = buildState.currentPhase;
                  if (phase) onSkipPhase(phase.number);
                }}
                className="py-1.5 px-3 text-xs bg-zinc-700 text-zinc-300 hover:bg-zinc-600 rounded-lg transition-colors"
              >
                ⏭️ Skip
              </button>
            )}
            {buildState.currentPhase &&
              buildState.currentPhase.status === 'failed' &&
              onRetryPhase && (
                <button
                  onClick={() => {
                    const phase = buildState.currentPhase;
                    if (phase) onRetryPhase(phase.number);
                  }}
                  className="py-1.5 px-3 text-xs bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 rounded-lg transition-colors"
                >
                  🔄 Retry
                </button>
              )}
          </div>
        </div>
      )}

      {/* Phase Detail Modal */}
      {selectedUiPhase && selectedDynamicPhase && (
        <PhaseDetailView
          phase={selectedUiPhase}
          isOpen={true}
          onClose={handleClosePhaseDetail}
          onBuildPhase={() => {
            // Phase is already being built via the main flow
            handleClosePhaseDetail();
          }}
          onSkipPhase={() => {
            onSkipPhase?.(selectedDynamicPhase.number);
            handleClosePhaseDetail();
          }}
          onRetryPhase={() => {
            onRetryPhase?.(selectedDynamicPhase.number);
            handleClosePhaseDetail();
          }}
          generatedCode={selectedDynamicPhase.generatedCode}
          dynamicPhase={selectedDynamicPhase}
        />
      )}
    </div>
  );
}

export default AppConceptPanel;
