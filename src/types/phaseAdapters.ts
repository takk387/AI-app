/**
 * Phase Adapter Utilities
 *
 * Converts between DynamicPhase (from DynamicPhaseGenerator) and
 * BuildPhase (used by UI components) for backwards compatibility.
 */

import type { DynamicPhase, DynamicPhasePlan, FeatureClassification } from '@/types/dynamicPhases';
import type {
  BuildPhase,
  BuildProgress,
  PhaseId,
  PhaseStatus,
  PhaseTask,
  TaskStatus,
  ValidationCheck,
  ValidationType,
} from '@/types/buildPhases';
import type { PhaseExecutionManager } from '@/services/PhaseExecutionManager';

// ============================================================================
// STATUS MAPPING
// ============================================================================

/**
 * Map DynamicPhase status to BuildPhase status
 */
export function mapDynamicStatusToStatic(status: DynamicPhase['status']): PhaseStatus {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'in-progress':
      return 'in-progress';
    case 'completed':
      return 'completed';
    case 'skipped':
      return 'skipped';
    case 'failed':
      // BuildPhase doesn't have 'failed', treat as 'pending' for retry
      return 'pending';
    default:
      return 'pending';
  }
}

/**
 * Map task status for features
 */
function getTaskStatus(phaseStatus: DynamicPhase['status']): TaskStatus {
  switch (phaseStatus) {
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    default:
      return 'pending';
  }
}

// ============================================================================
// PHASE CONVERSION
// ============================================================================

/**
 * Generate a PhaseId-compatible string from phase number
 * Since DynamicPhase uses numbers, we create synthetic IDs
 */
export function generatePhaseId(phaseNumber: number): PhaseId {
  // Map first 5 phases to standard IDs for compatibility
  const standardIds: PhaseId[] = [
    'foundation',
    'features',
    'integration',
    'optimization',
    'polish',
  ];
  if (phaseNumber <= 5) {
    return standardIds[phaseNumber - 1];
  }
  // For phases beyond 5, we'll use a synthetic approach
  // The UI components should handle this gracefully
  return `phase-${phaseNumber}` as PhaseId;
}

/**
 * Convert a DynamicPhase to BuildPhase format for UI compatibility
 */
export function adaptDynamicPhaseToUI(phase: DynamicPhase): BuildPhase {
  // Convert features to PhaseTask[]
  const tasks: PhaseTask[] = phase.features.map((feature, idx) => ({
    id: `${phase.number}-task-${idx}`,
    name: feature,
    description: getFeatureDescription(feature, phase.featureDetails, idx),
    status: getTaskStatus(phase.status),
    generatedCode: phase.status === 'completed' ? phase.generatedCode : undefined,
    errors: phase.status === 'failed' ? phase.errors : undefined,
  }));

  // Convert testCriteria to ValidationCheck[]
  const validationChecks: ValidationCheck[] = phase.testCriteria.map((criterion, idx) => ({
    id: `${phase.number}-check-${idx}`,
    name: criterion,
    type: inferValidationType(criterion),
    passed: phase.status === 'completed',
    message: phase.status === 'completed' ? 'Passed' : undefined,
  }));

  return {
    id: generatePhaseId(phase.number),
    name: phase.name,
    description: phase.description,
    order: phase.number,
    status: mapDynamicStatusToStatic(phase.status),
    estimatedTime: phase.estimatedTime,
    tasks,
    validationChecks,
  };
}

/**
 * Convert all phases in a plan to BuildPhase[]
 */
export function adaptAllPhasesToUI(plan: DynamicPhasePlan): BuildPhase[] {
  return plan.phases.map(adaptDynamicPhaseToUI);
}

// ============================================================================
// PROGRESS CONVERSION
// ============================================================================

/**
 * Convert DynamicPhasePlan progress to BuildProgress format
 */
export function adaptDynamicProgressToUI(
  plan: DynamicPhasePlan,
  manager?: PhaseExecutionManager
): BuildProgress {
  const currentPhase = plan.phases.find((p) => p.status === 'in-progress');
  const completedCount = plan.completedPhaseNumbers.length;

  return {
    currentPhaseId: currentPhase ? generatePhaseId(currentPhase.number) : null,
    currentPhaseIndex: currentPhase ? currentPhase.number - 1 : -1,
    totalPhases: plan.totalPhases,
    completedPhases: plan.completedPhaseNumbers.map((n) => generatePhaseId(n)),
    percentComplete: Math.round((completedCount / plan.totalPhases) * 100),
    estimatedTimeRemaining: calculateRemainingTime(plan),
    startedAt: plan.createdAt,
    lastUpdated: plan.updatedAt,
  };
}

/**
 * Create progress info from PhaseExecutionManager
 */
export function getProgressFromManager(manager: PhaseExecutionManager): {
  completed: number;
  total: number;
  percentage: number;
  currentPhase: DynamicPhase | null;
} {
  return manager.getProgress();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get feature description from feature details if available
 */
function getFeatureDescription(
  featureName: string,
  featureDetails: FeatureClassification[],
  index: number
): string {
  const detail = featureDetails[index];
  if (detail && detail.originalFeature) {
    return detail.originalFeature.description || `Implement ${featureName}`;
  }
  return `Implement ${featureName}`;
}

/**
 * Infer validation type from criterion text
 */
function inferValidationType(criterion: string): ValidationType {
  const lowerCriterion = criterion.toLowerCase();

  if (lowerCriterion.includes('render') || lowerCriterion.includes('display')) {
    return 'render';
  }
  if (
    lowerCriterion.includes('console') ||
    lowerCriterion.includes('error') ||
    lowerCriterion.includes('log')
  ) {
    return 'console';
  }
  if (
    lowerCriterion.includes('performance') ||
    lowerCriterion.includes('speed') ||
    lowerCriterion.includes('load')
  ) {
    return 'performance';
  }
  return 'functionality';
}

/**
 * Calculate remaining time estimate
 */
function calculateRemainingTime(plan: DynamicPhasePlan): string {
  const remainingPhases = plan.phases.filter(
    (p) => p.status === 'pending' || p.status === 'in-progress'
  );

  if (remainingPhases.length === 0) {
    return '0 min';
  }

  // Parse estimated times and sum them
  let totalMinutes = 0;
  for (const phase of remainingPhases) {
    const match = phase.estimatedTime.match(/(\d+)(?:-(\d+))?\s*min/i);
    if (match) {
      // Use the average of the range
      const min = parseInt(match[1], 10);
      const max = match[2] ? parseInt(match[2], 10) : min;
      totalMinutes += (min + max) / 2;
    }
  }

  if (totalMinutes < 1) {
    return '< 1 min';
  }
  if (totalMinutes === 1) {
    return '1 min';
  }
  return `${Math.round(totalMinutes)} min`;
}

// ============================================================================
// EXTENDED PHASE INFO FOR UI
// ============================================================================

/**
 * Extended phase information for detailed UI views
 */
export interface ExtendedPhaseInfo {
  phase: DynamicPhase;
  uiPhase: BuildPhase;
  dependencies: {
    phaseNumber: number;
    phaseName: string;
    isCompleted: boolean;
  }[];
  featureBreakdown: {
    name: string;
    complexity: 'simple' | 'moderate' | 'complex';
    estimatedTokens: number;
    domain: string;
  }[];
  canStart: boolean;
  blockedBy: string[];
}

/**
 * Get extended phase info for detailed views
 */
export function getExtendedPhaseInfo(
  phase: DynamicPhase,
  plan: DynamicPhasePlan
): ExtendedPhaseInfo {
  // Get dependency info
  const dependencies = phase.dependencies.map((depNum) => {
    const depPhase = plan.phases.find((p) => p.number === depNum);
    return {
      phaseNumber: depNum,
      phaseName: depPhase?.name || `Phase ${depNum}`,
      isCompleted: depPhase?.status === 'completed' || depPhase?.status === 'skipped',
    };
  });

  // Check if can start (all dependencies completed)
  const blockedBy = dependencies.filter((d) => !d.isCompleted).map((d) => d.phaseName);
  const canStart = blockedBy.length === 0 && phase.status === 'pending';

  // Get feature breakdown
  const featureBreakdown = phase.featureDetails.map((fd) => ({
    name: fd.originalFeature.name,
    complexity: fd.complexity,
    estimatedTokens: fd.estimatedTokens,
    domain: fd.domain,
  }));

  return {
    phase,
    uiPhase: adaptDynamicPhaseToUI(phase),
    dependencies,
    featureBreakdown,
    canStart,
    blockedBy,
  };
}

// ============================================================================
// PLAN SUMMARY
// ============================================================================

/**
 * Summary of a dynamic phase plan for quick display
 */
export interface PlanSummary {
  appName: string;
  totalPhases: number;
  complexity: string;
  estimatedTotalTime: string;
  completedCount: number;
  inProgressCount: number;
  pendingCount: number;
  failedCount: number;
  percentComplete: number;
  phases: {
    number: number;
    name: string;
    status: string;
    estimatedTime: string;
  }[];
}

/**
 * Get a summary of the phase plan
 */
export function getPlanSummary(plan: DynamicPhasePlan): PlanSummary {
  const completedCount = plan.phases.filter((p) => p.status === 'completed').length;
  const inProgressCount = plan.phases.filter((p) => p.status === 'in-progress').length;
  const failedCount = plan.phases.filter((p) => p.status === 'failed').length;
  const pendingCount = plan.phases.filter((p) => p.status === 'pending').length;

  return {
    appName: plan.appName,
    totalPhases: plan.totalPhases,
    complexity: plan.complexity,
    estimatedTotalTime: plan.estimatedTotalTime,
    completedCount,
    inProgressCount,
    pendingCount,
    failedCount,
    percentComplete: Math.round((completedCount / plan.totalPhases) * 100),
    phases: plan.phases.map((p) => ({
      number: p.number,
      name: p.name,
      status: p.status,
      estimatedTime: p.estimatedTime,
    })),
  };
}
