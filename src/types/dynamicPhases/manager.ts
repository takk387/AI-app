/**
 * Dynamic Phase Generation System - Phase Manager State Container
 *
 * Readonly snapshot type for PhaseExecutionManager's internal state.
 */

import type {
  DynamicPhasePlan,
  AccumulatedFile,
  AccumulatedFeature,
  APIContract,
} from './structures';
import type { PhaseSnapshot, TypeCheckResult, TypeDefinition, PhaseTestResults } from './integrity';

// ============================================================================
// PHASE MANAGER STATE CONTAINER
// ============================================================================

/**
 * Readonly snapshot of PhaseExecutionManager's internal state.
 *
 * Returned by `PhaseExecutionManager.getState()` for debugging, testing,
 * and state inspection without exposing mutable internals.
 *
 * ## State Invariants
 *
 * 1. **accumulatedFiles ⊆ accumulatedFilesRich.map(f => f.path)**
 *    The string[] array is always a projection of the rich array.
 *    `syncLegacyProjections()` enforces this after every `recordPhaseResult()`.
 *
 * 2. **accumulatedFeatures ⊆ accumulatedFeaturesRich.map(f => f.name)**
 *    Same projection rule for features.
 *
 * 3. **completedPhases is sorted ascending and monotonically growing**
 *    Phases are appended in execution order. Never re-ordered or removed
 *    (except via `rollbackToSnapshot()`).
 *
 * 4. **phaseSnapshots[n] is immutable once captured**
 *    Snapshots are deep copies. Mutations to live state do not affect them.
 *
 * 5. **plan.currentPhaseNumber === max(completedPhases) + 1** (during normal execution)
 *    After recording a result, currentPhaseNumber advances to the next phase.
 *
 * 6. **rawGeneratedFiles grows monotonically**
 *    Files are appended per phase. Content is never updated — conflict detection
 *    uses `fileVersionMap` to track hash changes across phases.
 */
export interface PhaseManagerState {
  readonly plan: DynamicPhasePlan;
  readonly accumulatedCode: string;
  readonly accumulatedFiles: readonly string[];
  readonly accumulatedFeatures: readonly string[];
  readonly completedPhases: readonly number[];
  readonly accumulatedFilesRich: readonly AccumulatedFile[];
  readonly accumulatedFeaturesRich: readonly AccumulatedFeature[];
  readonly establishedPatterns: readonly string[];
  readonly apiContracts: readonly APIContract[];
  readonly rawGeneratedFiles: ReadonlyArray<{ path: string; content: string }>;
  readonly fileVersionMap: ReadonlyMap<string, { hash: string; phase: number; exports: string[] }>;
  readonly phaseSnapshots: ReadonlyMap<number, PhaseSnapshot>;
  readonly typeCheckResults: ReadonlyMap<number, TypeCheckResult>;
  readonly typeDefinitions: readonly TypeDefinition[];
  readonly phaseTestResults: ReadonlyMap<number, PhaseTestResults>;
}
