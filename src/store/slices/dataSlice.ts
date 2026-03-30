import type { StateCreator } from 'zustand';
import type {
  PendingChange,
  PendingDiff,
  StagePlan,
  GeneratedComponent,
  QualityReport,
  PerformanceReport,
  CurrentStagePlan,
  CompareVersions,
} from '@/types/aiBuilderTypes';
import type { AppConcept, ImplementationPlan } from '@/types/appConcept';
import type { LayoutManifest } from '@/types/schema';
import type { PhaseId } from '@/types/buildPhases';
import type { DynamicPhasePlan } from '@/types/dynamicPhases';
import type { DeploymentInstructions } from '@/utils/exportApp';
import type { DesignSpec } from '@/types/designSpec';
import type { BuildSettings, LayoutThumbnail } from '@/types/reviewTypes';
import type { AppFile } from '@/types/railway';
import type { AppState } from '../useAppStore';

/**
 * Data slice state
 *
 * ## Layout Data Map (3 sources of truth)
 *
 * | Field                     | Type              | Source of Truth For           | Set By                     |
 * |---------------------------|-------------------|------------------------------|----------------------------|
 * | `currentLayoutManifest`   | `LayoutManifest`  | **Design intent** — colors,  | LayoutBuilderView          |
 * |                           |                   | typography, component layout | (Gemini vision + user)     |
 * | `layoutBuilderFiles`      | `AppFile[]`       | **Generated code** — actual  | LayoutBuilderView          |
 * |                           |                   | React/CSS implementing the   | (code generation step)     |
 * |                           |                   | manifest                     |                            |
 * | `appConcept.layoutManifest`| `LayoutManifest` | **Snapshot** — copy of       | useConceptSync (auto)      |
 * |                           |                   | currentLayoutManifest frozen |                            |
 * |                           |                   | into the concept for export  |                            |
 *
 * `currentLayoutManifest` is the live design state — edit this.
 * `layoutBuilderFiles` is the code artifact — injected into Phase 1 by `tryStartPhase1()`.
 * `appConcept.layoutManifest` is a read-only snapshot — never edit directly.
 *
 * VisualManifest[] (from VisionLoopEngine) is transient runtime analysis and NOT persisted.
 */
export interface DataSlice {
  pendingChange: PendingChange | null;
  pendingDiff: PendingDiff | null;
  deploymentInstructions: DeploymentInstructions | null;
  exportingApp: GeneratedComponent | null;
  compareVersions: CompareVersions;
  currentStagePlan: CurrentStagePlan | null;
  newAppStagePlan: StagePlan | null;
  appConcept: AppConcept | null;
  implementationPlan: ImplementationPlan | null;
  qualityReport: QualityReport | null;
  performanceReport: PerformanceReport | null;
  // Advanced phase build
  selectedPhaseId: PhaseId | null;
  isValidating: boolean;
  // Image upload
  uploadedImage: string | null;
  // Layout Builder (Gemini 3 system uses LayoutManifest)
  currentLayoutManifest: LayoutManifest | null;
  savedLayoutManifests: LayoutManifest[];
  // Design Specification (extracted from images for theming)
  currentDesignSpec: DesignSpec | null;
  // Dynamic Phase Plan
  dynamicPhasePlan: DynamicPhasePlan | null;
  // Layout Builder generated code (persisted for layout injection into builder)
  layoutBuilderFiles: AppFile[] | null;
  // Review state
  isReviewed: boolean;
  buildSettings: BuildSettings;
  layoutThumbnail: LayoutThumbnail | null;
  phasePlanGeneratedAt: string | null;
  // Actions
  setPendingChange: (change: PendingChange | null) => void;
  setPendingDiff: (diff: PendingDiff | null) => void;
  setDeploymentInstructions: (instructions: DeploymentInstructions | null) => void;
  setExportingApp: (app: GeneratedComponent | null) => void;
  setCompareVersions: (versions: CompareVersions) => void;
  setCurrentStagePlan: (plan: CurrentStagePlan | null) => void;
  setNewAppStagePlan: (
    plan: StagePlan | null | ((prev: StagePlan | null) => StagePlan | null)
  ) => void;
  setAppConcept: (concept: AppConcept | null) => void;
  setImplementationPlan: (plan: ImplementationPlan | null) => void;
  setQualityReport: (report: QualityReport | null) => void;
  setPerformanceReport: (report: PerformanceReport | null) => void;
  setSelectedPhaseId: (phaseId: PhaseId | null) => void;
  setIsValidating: (isValidating: boolean) => void;
  setUploadedImage: (image: string | null) => void;
  // Layout Builder actions (Gemini 3 system uses LayoutManifest)
  setCurrentLayoutManifest: (manifest: LayoutManifest | null) => void;
  setSavedLayoutManifests: (manifests: LayoutManifest[]) => void;
  addSavedLayoutManifest: (manifest: LayoutManifest) => void;
  removeSavedLayoutManifest: (id: string) => void;
  // Design Specification action
  setCurrentDesignSpec: (spec: DesignSpec | null) => void;
  // App Concept field updates
  updateAppConceptField: (path: string, value: unknown) => void;
  // Dynamic Phase Plan action
  setDynamicPhasePlan: (plan: DynamicPhasePlan | null) => void;
  // Layout Builder files action
  setLayoutBuilderFiles: (files: AppFile[] | null) => void;
  // Review actions
  setIsReviewed: (reviewed: boolean) => void;
  setBuildSettings: (settings: Partial<BuildSettings>) => void;
  setLayoutThumbnail: (thumbnail: LayoutThumbnail | null) => void;
  setPhasePlanGeneratedAt: (timestamp: string | null) => void;
}

export const createDataSlice: StateCreator<AppState, [['zustand/immer', never]], [], DataSlice> = (
  set
) => ({
  pendingChange: null as PendingChange | null,
  pendingDiff: null as PendingDiff | null,
  deploymentInstructions: null as DeploymentInstructions | null,
  exportingApp: null as GeneratedComponent | null,
  compareVersions: { v1: null, v2: null } as CompareVersions,
  currentStagePlan: null as CurrentStagePlan | null,
  newAppStagePlan: null as StagePlan | null,
  appConcept: null as AppConcept | null,
  implementationPlan: null as ImplementationPlan | null,
  qualityReport: null as QualityReport | null,
  performanceReport: null as PerformanceReport | null,
  selectedPhaseId: null as PhaseId | null,
  isValidating: false,
  uploadedImage: null as string | null,
  currentLayoutManifest: null as LayoutManifest | null,
  savedLayoutManifests: [] as LayoutManifest[],
  currentDesignSpec: null as DesignSpec | null,
  dynamicPhasePlan: null as DynamicPhasePlan | null,
  // Review state
  isReviewed: false,
  buildSettings: { autoAdvance: true } as BuildSettings,
  layoutThumbnail: null as LayoutThumbnail | null,
  phasePlanGeneratedAt: null as string | null,
  layoutBuilderFiles: null as AppFile[] | null,

  setPendingChange: (change) => set({ pendingChange: change }),
  setPendingDiff: (diff) => set({ pendingDiff: diff }),
  setDeploymentInstructions: (instructions) => set({ deploymentInstructions: instructions }),
  setExportingApp: (app) => set({ exportingApp: app }),
  setCompareVersions: (versions) => set({ compareVersions: versions }),
  setCurrentStagePlan: (plan) => set({ currentStagePlan: plan }),
  setNewAppStagePlan: (plan) =>
    set((state) => ({
      newAppStagePlan: typeof plan === 'function' ? plan(state.newAppStagePlan) : plan,
    })),
  setAppConcept: (concept) => set({ appConcept: concept }),
  setImplementationPlan: (plan) => set({ implementationPlan: plan }),
  setQualityReport: (report) => set({ qualityReport: report }),
  setPerformanceReport: (report) => set({ performanceReport: report }),
  setSelectedPhaseId: (phaseId) => set({ selectedPhaseId: phaseId }),
  setIsValidating: (isValidating) => set({ isValidating }),
  setUploadedImage: (image) => set({ uploadedImage: image }),
  setCurrentLayoutManifest: (manifest) => set({ currentLayoutManifest: manifest }),
  setCurrentDesignSpec: (spec) => set({ currentDesignSpec: spec }),
  setSavedLayoutManifests: (manifests) => set({ savedLayoutManifests: manifests }),
  addSavedLayoutManifest: (manifest) =>
    set((state) => ({
      savedLayoutManifests: [...state.savedLayoutManifests, manifest],
    })),
  removeSavedLayoutManifest: (id) =>
    set((state) => ({
      savedLayoutManifests: state.savedLayoutManifests.filter((m) => m.id !== id),
    })),
  updateAppConceptField: (path, value) =>
    set((state) => {
      if (!state.appConcept) return state;
      const keys = path.split('.');
      const updated = { ...state.appConcept };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let current: any = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      // Update timestamp to trigger auto-capture in documentation
      updated.updatedAt = new Date().toISOString();
      return { appConcept: updated };
    }),
  setDynamicPhasePlan: (plan) => set({ dynamicPhasePlan: plan }),
  // Review actions
  setIsReviewed: (reviewed) => set({ isReviewed: reviewed }),
  setBuildSettings: (settings) =>
    set((state) => ({
      buildSettings: { ...state.buildSettings, ...settings },
    })),
  setLayoutThumbnail: (thumbnail) => set({ layoutThumbnail: thumbnail }),
  setPhasePlanGeneratedAt: (timestamp) => set({ phasePlanGeneratedAt: timestamp }),
  setLayoutBuilderFiles: (files) => set({ layoutBuilderFiles: files }),
});
