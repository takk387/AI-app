import type { StateCreator } from 'zustand';
import type {
  FinalValidatedArchitecture,
  ArchitecturePosition,
  EscalationData,
  UserAISelection,
  DualPlanProgress,
  IntelligenceContext,
} from '@/types/dualPlanning';
import type { AppState } from '../useAppStore';

/**
 * Dual AI Planning slice state
 */
export interface DualPlanningSlice {
  dualArchitectureResult: FinalValidatedArchitecture | null;
  dualArchitectureEscalation: EscalationData | null;
  userAISelection: UserAISelection | null;
  dualPlanProgress: DualPlanProgress | null;
  cachedIntelligence: IntelligenceContext | null;
  /** Individual architecture positions from each AI (always available after pipeline completes) */
  claudeArchitecturePosition: ArchitecturePosition | null;
  geminiArchitecturePosition: ArchitecturePosition | null;
  architectureNegotiationRounds: number;
  /** Whether the user has reviewed and confirmed the architecture choice */
  architectureReviewed: boolean;
  // Actions
  setDualArchitectureResult: (result: FinalValidatedArchitecture | null) => void;
  setDualArchitectureEscalation: (escalation: EscalationData | null) => void;
  setUserAISelection: (selection: UserAISelection | null) => void;
  setDualPlanProgress: (progress: DualPlanProgress | null) => void;
  setCachedIntelligence: (ctx: IntelligenceContext | null) => void;
  setClaudeArchitecturePosition: (arch: ArchitecturePosition | null) => void;
  setGeminiArchitecturePosition: (arch: ArchitecturePosition | null) => void;
  setArchitectureNegotiationRounds: (rounds: number) => void;
  setArchitectureReviewed: (reviewed: boolean) => void;
}

export const createDualPlanningSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  DualPlanningSlice
> = (set) => ({
  dualArchitectureResult: null as FinalValidatedArchitecture | null,
  dualArchitectureEscalation: null as EscalationData | null,
  userAISelection: null as UserAISelection | null,
  dualPlanProgress: null as DualPlanProgress | null,
  cachedIntelligence: null as IntelligenceContext | null,
  claudeArchitecturePosition: null as ArchitecturePosition | null,
  geminiArchitecturePosition: null as ArchitecturePosition | null,
  architectureNegotiationRounds: 0,
  architectureReviewed: false,

  setDualArchitectureResult: (result) => set({ dualArchitectureResult: result }),
  setDualArchitectureEscalation: (escalation) => set({ dualArchitectureEscalation: escalation }),
  setUserAISelection: (selection) => set({ userAISelection: selection }),
  setDualPlanProgress: (progress) => set({ dualPlanProgress: progress }),
  setCachedIntelligence: (ctx) => set({ cachedIntelligence: ctx }),
  setClaudeArchitecturePosition: (arch) => set({ claudeArchitecturePosition: arch }),
  setGeminiArchitecturePosition: (arch) => set({ geminiArchitecturePosition: arch }),
  setArchitectureNegotiationRounds: (rounds) => set({ architectureNegotiationRounds: rounds }),
  setArchitectureReviewed: (reviewed) => set({ architectureReviewed: reviewed }),
});
