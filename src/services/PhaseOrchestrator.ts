/**
 * Phase Orchestrator Service
 * Manages the execution and orchestration of build phases
 */

import type {
  BuildPhase,
  PhaseId,
  PhaseResult,
  ValidationResult,
  BuildProgress,
  PhasedAppConcept,
  PhaseTask,
  ValidationCheck,
} from '../types/buildPhases';

// Import constants for use
import {
  DEFAULT_PHASES,
  PHASE_FOCUS_AREAS,
  PHASE_VALIDATION_CRITERIA,
} from '../types/buildPhases';

export interface PhaseOrchestratorState {
  phases: BuildPhase[];
  currentPhaseIndex: number;
  concept: PhasedAppConcept | null;
  isBuilding: boolean;
  isPaused: boolean;
  accumulatedCode: string;
  errors: string[];
  warnings: string[];
}

export interface PhaseOrchestratorConfig {
  onPhaseStart?: (phase: BuildPhase) => void;
  onPhaseComplete?: (phase: BuildPhase, result: PhaseResult) => void;
  onValidationComplete?: (phase: BuildPhase, result: ValidationResult) => void;
  onBuildComplete?: (progress: BuildProgress) => void;
  onError?: (error: Error, phase?: BuildPhase) => void;
  onProgress?: (progress: BuildProgress) => void;
}

/**
 * PhaseOrchestrator - Manages the execution of build phases
 */
export class PhaseOrchestrator {
  private state: PhaseOrchestratorState;
  private config: PhaseOrchestratorConfig;
  private startTime: number = 0;

  constructor(config: PhaseOrchestratorConfig = {}) {
    this.config = config;
    this.state = this.getInitialState();
  }

  private getInitialState(): PhaseOrchestratorState {
    return {
      phases: this.initializePhases(),
      currentPhaseIndex: -1,
      concept: null,
      isBuilding: false,
      isPaused: false,
      accumulatedCode: '',
      errors: [],
      warnings: [],
    };
  }

  private initializePhases(): BuildPhase[] {
    return DEFAULT_PHASES.map((phase) => ({
      ...phase,
      tasks: this.createTasksForPhase(phase.id),
      validationChecks: this.createValidationChecks(phase.id),
    }));
  }

  private createTasksForPhase(phaseId: PhaseId): PhaseTask[] {
    const focusAreas = PHASE_FOCUS_AREAS[phaseId] || [];
    return focusAreas.map((area, index) => ({
      id: `${phaseId}-task-${index}`,
      name: area,
      description: `Generate ${area.toLowerCase()}`,
      status: 'pending' as const,
    }));
  }

  private createValidationChecks(phaseId: PhaseId): ValidationCheck[] {
    const criteria = PHASE_VALIDATION_CRITERIA[phaseId] || [];
    return criteria.map((criterion, index) => ({
      id: `${phaseId}-check-${index}`,
      name: criterion,
      type: this.inferValidationType(criterion),
      passed: false,
    }));
  }

  private inferValidationType(criterion: string): ValidationCheck['type'] {
    const lowerCriterion = criterion.toLowerCase();
    if (lowerCriterion.includes('render') || lowerCriterion.includes('layout')) {
      return 'render';
    }
    if (lowerCriterion.includes('console') || lowerCriterion.includes('error')) {
      return 'console';
    }
    if (lowerCriterion.includes('performance') || lowerCriterion.includes('metric')) {
      return 'performance';
    }
    return 'functionality';
  }

  /**
   * Get current state
   */
  getState(): PhaseOrchestratorState {
    return { ...this.state };
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): BuildPhase | null {
    if (this.state.currentPhaseIndex < 0 || this.state.currentPhaseIndex >= this.state.phases.length) {
      return null;
    }
    return this.state.phases[this.state.currentPhaseIndex];
  }

  /**
   * Get all phases
   */
  getPhases(): BuildPhase[] {
    return [...this.state.phases];
  }

  /**
   * Get build progress
   */
  getProgress(): BuildProgress {
    const completedPhases = this.state.phases
      .filter((p) => p.status === 'completed')
      .map((p) => p.id);
    
    const currentPhase = this.getCurrentPhase();
    const totalPhases = this.state.phases.filter((p) => p.status !== 'skipped').length;
    const completedCount = completedPhases.length;
    const percentComplete = totalPhases > 0 ? Math.round((completedCount / totalPhases) * 100) : 0;

    // Estimate remaining time
    const remainingPhases = this.state.phases.filter(
      (p) => p.status === 'pending' || p.status === 'in-progress'
    );
    const estimatedMinutes = remainingPhases.reduce((total, phase) => {
      const timeStr = phase.estimatedTime;
      const match = timeStr.match(/(\d+)/);
      return total + (match ? parseInt(match[1]) : 3);
    }, 0);

    return {
      currentPhaseId: currentPhase?.id || null,
      currentPhaseIndex: this.state.currentPhaseIndex,
      totalPhases,
      completedPhases,
      percentComplete,
      estimatedTimeRemaining: `${estimatedMinutes} min`,
      startedAt: this.startTime > 0 ? new Date(this.startTime).toISOString() : '',
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Start build process with app concept
   */
  async startBuild(concept: PhasedAppConcept): Promise<void> {
    this.state.concept = concept;
    this.state.isBuilding = true;
    this.state.isPaused = false;
    this.state.currentPhaseIndex = 0;
    this.state.accumulatedCode = '';
    this.state.errors = [];
    this.state.warnings = [];
    this.startTime = Date.now();

    // Reset all phases to pending
    this.state.phases = this.state.phases.map((phase) => ({
      ...phase,
      status: 'pending' as const,
      tasks: phase.tasks.map((task) => ({ ...task, status: 'pending' as const })),
      validationChecks: phase.validationChecks.map((check) => ({ ...check, passed: false })),
    }));

    // Determine which phases to skip based on complexity
    this.adjustPhasesForComplexity(concept.complexity);

    this.config.onProgress?.(this.getProgress());
  }

  private adjustPhasesForComplexity(complexity: PhasedAppConcept['complexity']): void {
    if (complexity === 'simple') {
      // Skip optimization and polish for simple apps
      this.state.phases = this.state.phases.map((phase) => {
        if (phase.id === 'optimization' || phase.id === 'polish') {
          return { ...phase, status: 'skipped' as const };
        }
        return phase;
      });
    } else if (complexity === 'moderate') {
      // Skip optimization for moderate apps
      this.state.phases = this.state.phases.map((phase) => {
        if (phase.id === 'optimization') {
          return { ...phase, status: 'skipped' as const };
        }
        return phase;
      });
    }
  }

  /**
   * Execute current phase
   */
  async executePhase(phaseId: PhaseId): Promise<PhaseResult> {
    const phaseIndex = this.state.phases.findIndex((p) => p.id === phaseId);
    if (phaseIndex === -1) {
      throw new Error(`Phase ${phaseId} not found`);
    }

    const phase = this.state.phases[phaseIndex];
    if (phase.status === 'skipped') {
      return {
        phaseId,
        success: true,
        tasksCompleted: 0,
        totalTasks: 0,
        duration: 0,
        warnings: ['Phase was skipped'],
      };
    }

    // Update phase status
    this.state.phases[phaseIndex] = { ...phase, status: 'in-progress' };
    this.state.currentPhaseIndex = phaseIndex;
    this.config.onPhaseStart?.(this.state.phases[phaseIndex]);

    const startTime = Date.now();
    const result: PhaseResult = {
      phaseId,
      success: false,
      tasksCompleted: 0,
      totalTasks: phase.tasks.length,
      duration: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Execute tasks (in real implementation, this would call AI API)
      for (let i = 0; i < phase.tasks.length; i++) {
        if (this.state.isPaused) {
          result.warnings?.push('Build paused during execution');
          break;
        }

        const task = phase.tasks[i];
        // Mark task as completed (actual generation would happen here)
        this.state.phases[phaseIndex].tasks[i] = {
          ...task,
          status: 'completed',
        };
        result.tasksCompleted++;
      }

      result.success = result.tasksCompleted === result.totalTasks;
      result.duration = Date.now() - startTime;

      // Update phase status
      this.state.phases[phaseIndex] = {
        ...this.state.phases[phaseIndex],
        status: result.success ? 'completed' : 'pending',
      };

      this.config.onPhaseComplete?.(this.state.phases[phaseIndex], result);
      this.config.onProgress?.(this.getProgress());

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors = [error instanceof Error ? error.message : 'Unknown error'];
      this.config.onError?.(error instanceof Error ? error : new Error('Unknown error'), phase);
      return result;
    }
  }

  /**
   * Validate current phase
   */
  async validatePhase(phaseId: PhaseId): Promise<ValidationResult> {
    const phaseIndex = this.state.phases.findIndex((p) => p.id === phaseId);
    if (phaseIndex === -1) {
      throw new Error(`Phase ${phaseId} not found`);
    }

    const phase = this.state.phases[phaseIndex];
    const checks = phase.validationChecks.map((check) => ({
      ...check,
      passed: true, // In real implementation, would run actual checks
      message: `${check.name} validated successfully`,
    }));

    const passed = checks.every((c) => c.passed);
    const result: ValidationResult = {
      phaseId,
      passed,
      checks,
      canProceed: passed || checks.filter((c) => !c.passed).every((c) => c.type !== 'render'),
      warnings: checks.filter((c) => !c.passed).map((c) => c.name),
    };

    // Update validation checks in phase
    this.state.phases[phaseIndex] = {
      ...phase,
      validationChecks: checks,
    };

    this.config.onValidationComplete?.(this.state.phases[phaseIndex], result);
    return result;
  }

  /**
   * Proceed to next phase
   */
  async proceedToNextPhase(): Promise<void> {
    const nextIndex = this.findNextPendingPhaseIndex();
    if (nextIndex === -1) {
      // All phases complete
      this.state.isBuilding = false;
      this.config.onBuildComplete?.(this.getProgress());
      return;
    }

    this.state.currentPhaseIndex = nextIndex;
    this.config.onProgress?.(this.getProgress());
  }

  private findNextPendingPhaseIndex(): number {
    for (let i = this.state.currentPhaseIndex + 1; i < this.state.phases.length; i++) {
      if (this.state.phases[i].status === 'pending') {
        return i;
      }
    }
    return -1;
  }

  /**
   * Skip a phase
   */
  async skipPhase(phaseId: PhaseId): Promise<void> {
    const phaseIndex = this.state.phases.findIndex((p) => p.id === phaseId);
    if (phaseIndex === -1) {
      throw new Error(`Phase ${phaseId} not found`);
    }

    this.state.phases[phaseIndex] = {
      ...this.state.phases[phaseIndex],
      status: 'skipped',
    };

    this.config.onProgress?.(this.getProgress());
  }

  /**
   * Retry a failed phase
   */
  async retryPhase(phaseId: PhaseId): Promise<void> {
    const phaseIndex = this.state.phases.findIndex((p) => p.id === phaseId);
    if (phaseIndex === -1) {
      throw new Error(`Phase ${phaseId} not found`);
    }

    // Reset phase to pending
    this.state.phases[phaseIndex] = {
      ...this.state.phases[phaseIndex],
      status: 'pending',
      tasks: this.state.phases[phaseIndex].tasks.map((task) => ({
        ...task,
        status: 'pending',
        errors: undefined,
      })),
      validationChecks: this.state.phases[phaseIndex].validationChecks.map((check) => ({
        ...check,
        passed: false,
        message: undefined,
      })),
    };

    this.state.currentPhaseIndex = phaseIndex;
    this.config.onProgress?.(this.getProgress());
  }

  /**
   * Pause the build
   */
  pause(): void {
    this.state.isPaused = true;
  }

  /**
   * Resume the build
   */
  resume(): void {
    this.state.isPaused = false;
  }

  /**
   * Reset the orchestrator
   */
  reset(): void {
    this.state = this.getInitialState();
  }

  /**
   * Get accumulated code from all completed phases
   */
  getAccumulatedCode(): string {
    return this.state.accumulatedCode;
  }

  /**
   * Set accumulated code (called after each phase)
   */
  setAccumulatedCode(code: string): void {
    this.state.accumulatedCode = code;
  }
}

/**
 * Create a new PhaseOrchestrator instance
 */
export function createPhaseOrchestrator(config?: PhaseOrchestratorConfig): PhaseOrchestrator {
  return new PhaseOrchestrator(config);
}

export default PhaseOrchestrator;
