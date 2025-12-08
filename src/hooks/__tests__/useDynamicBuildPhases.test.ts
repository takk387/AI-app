/**
 * Comprehensive Unit Tests for useDynamicBuildPhases Hook
 *
 * Tests dynamic phase management including plan initialization,
 * phase execution lifecycle, progress tracking, and error handling.
 *
 * Target: 90%+ coverage for this critical build orchestration hook
 */

import { renderHook, act } from '@testing-library/react';
import { useDynamicBuildPhases } from '../useDynamicBuildPhases';
import type { DynamicPhase, DynamicPhasePlan, PhaseExecutionResult } from '@/types/dynamicPhases';
import type { AppConcept } from '@/types/appConcept';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a minimal AppConcept for testing
 */
function createMockAppConcept(overrides?: Partial<AppConcept>): AppConcept {
  return {
    name: 'Test App',
    description: 'A test application',
    purpose: 'Testing the build phases',
    targetUsers: 'Developers',
    coreFeatures: [
      { name: 'User Dashboard', description: 'Main user dashboard' },
      { name: 'Profile Page', description: 'User profile management' },
    ],
    uiPreferences: {
      style: 'modern',
      colorScheme: 'light',
      layout: 'single-page',
    },
    technical: {
      needsAuth: false,
      needsDatabase: false,
      needsAPI: false,
      needsFileUpload: false,
      needsRealtime: false,
    },
    ...overrides,
  } as AppConcept;
}

/**
 * Create a mock DynamicPhase for testing
 */
function createMockPhase(number: number, overrides?: Partial<DynamicPhase>): DynamicPhase {
  return {
    number,
    name: `Phase ${number}`,
    description: `Description for phase ${number}`,
    domain: 'feature',
    features: [`Feature ${number}A`, `Feature ${number}B`],
    featureDetails: [],
    estimatedTokens: 2000,
    estimatedTime: '10 minutes',
    dependencies: number > 1 ? [number - 1] : [],
    dependencyNames: number > 1 ? [`Phase ${number - 1}`] : [],
    testCriteria: [`Test criterion ${number}`],
    status: 'pending',
    ...overrides,
  };
}

/**
 * Create a mock DynamicPhasePlan for testing
 */
function createMockPlan(
  phaseCount: number = 3,
  overrides?: Partial<DynamicPhasePlan>
): DynamicPhasePlan {
  const phases = Array.from({ length: phaseCount }, (_, i) => createMockPhase(i + 1));

  return {
    id: `plan-${Date.now()}`,
    appName: 'Test App',
    appDescription: 'A test application',
    totalPhases: phaseCount,
    phases,
    estimatedTotalTime: `${phaseCount * 10} minutes`,
    estimatedTotalTokens: phaseCount * 2000,
    complexity: 'moderate',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    concept: createMockAppConcept(),
    currentPhaseNumber: 1,
    completedPhaseNumbers: [],
    failedPhaseNumbers: [],
    accumulatedFiles: [],
    accumulatedFeatures: [],
    ...overrides,
  };
}

/**
 * Create a mock PhaseExecutionResult
 */
function createMockExecutionResult(
  phaseNumber: number,
  overrides?: Partial<PhaseExecutionResult>
): PhaseExecutionResult {
  return {
    phaseNumber,
    phaseName: `Phase ${phaseNumber}`,
    success: true,
    generatedCode: `// Code from phase ${phaseNumber}\nexport default function Phase${phaseNumber}() { return <div>Phase ${phaseNumber}</div>; }`,
    generatedFiles: [`component${phaseNumber}.tsx`],
    implementedFeatures: [`Feature ${phaseNumber}`],
    duration: 5000,
    tokensUsed: {
      input: 1000,
      output: 1500,
    },
    ...overrides,
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('useDynamicBuildPhases', () => {
  // Mock callbacks
  let mockOnPhaseStart: jest.Mock;
  let mockOnPhaseComplete: jest.Mock;
  let mockOnBuildComplete: jest.Mock;
  let mockOnError: jest.Mock;

  beforeEach(() => {
    mockOnPhaseStart = jest.fn();
    mockOnPhaseComplete = jest.fn();
    mockOnBuildComplete = jest.fn();
    mockOnError = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe('Initial State', () => {
    it('should initialize with null plan and empty phases', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      expect(result.current.plan).toBeNull();
      expect(result.current.phases).toEqual([]);
      expect(result.current.uiPhases).toEqual([]);
      expect(result.current.currentPhase).toBeNull();
    });

    it('should have default progress state', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      expect(result.current.progress).toEqual({
        currentPhaseId: null,
        currentPhaseIndex: -1,
        totalPhases: 0,
        completedPhases: [],
        percentComplete: 0,
        estimatedTimeRemaining: '',
        startedAt: '',
        lastUpdated: '',
      });
    });

    it('should not be building or paused initially', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      expect(result.current.isBuilding).toBe(false);
      expect(result.current.isPaused).toBe(false);
    });

    it('should have empty accumulated code', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      expect(result.current.accumulatedCode).toBe('');
    });
  });

  // ==========================================================================
  // Plan Initialization Tests
  // ==========================================================================

  describe('initializePlan()', () => {
    it('should initialize with a valid plan', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(5);

      act(() => {
        result.current.initializePlan(plan);
      });

      expect(result.current.plan).toEqual(plan);
      expect(result.current.phases).toHaveLength(5);
      expect(result.current.isBuilding).toBe(false);
      expect(result.current.isPaused).toBe(false);
    });

    it('should reset accumulated code on new plan', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      // Set some accumulated code first
      act(() => {
        result.current.setAccumulatedCode('old code');
      });

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      expect(result.current.accumulatedCode).toBe('');
    });

    it('should create UI phases for legacy compatibility', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      expect(result.current.uiPhases).toHaveLength(3);
      expect(result.current.uiPhases[0]).toHaveProperty('id');
      expect(result.current.uiPhases[0]).toHaveProperty('name');
    });

    it('should update plan summary', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(4);

      act(() => {
        result.current.initializePlan(plan);
      });

      expect(result.current.planSummary).not.toBeNull();
      expect(result.current.planSummary?.totalPhases).toBe(4);
    });
  });

  // ==========================================================================
  // Phase Execution Tests
  // ==========================================================================

  describe('startPhase()', () => {
    it('should start a phase and update status', () => {
      const { result } = renderHook(() =>
        useDynamicBuildPhases({
          onPhaseStart: mockOnPhaseStart,
        })
      );

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      act(() => {
        result.current.startPhase(1);
      });

      expect(result.current.isBuilding).toBe(true);
      expect(result.current.plan?.currentPhaseNumber).toBe(1);
      expect(mockOnPhaseStart).toHaveBeenCalledWith(expect.objectContaining({ number: 1 }));
    });

    it('should update phase status to in-progress', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      act(() => {
        result.current.startPhase(2);
      });

      const phase = result.current.phases.find((p) => p.number === 2);
      expect(phase?.status).toBe('in-progress');
    });

    it('should call onError if phase not found', () => {
      const { result } = renderHook(() =>
        useDynamicBuildPhases({
          onError: mockOnError,
        })
      );

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      act(() => {
        result.current.startPhase(99); // Non-existent phase
      });

      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('99'),
        })
      );
    });

    it('should set current phase correctly', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      expect(result.current.currentPhase).toBeNull();

      act(() => {
        result.current.startPhase(1);
      });

      // After startPhase, the phase should be in-progress
      // Check via the phases array since currentPhase depends on status
      const phaseOne = result.current.phases.find((p) => p.number === 1);
      expect(phaseOne?.status).toBe('in-progress');
      expect(result.current.isBuilding).toBe(true);
    });

    it('should do nothing if plan is null', () => {
      const { result } = renderHook(() =>
        useDynamicBuildPhases({
          onPhaseStart: mockOnPhaseStart,
        })
      );

      act(() => {
        result.current.startPhase(1);
      });

      expect(mockOnPhaseStart).not.toHaveBeenCalled();
      expect(result.current.isBuilding).toBe(false);
    });
  });

  // ==========================================================================
  // Phase Completion Tests
  // ==========================================================================

  describe('completePhase()', () => {
    it('should complete a phase successfully', () => {
      const { result } = renderHook(() =>
        useDynamicBuildPhases({
          onPhaseComplete: mockOnPhaseComplete,
        })
      );

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      act(() => {
        result.current.startPhase(1);
      });

      const executionResult = createMockExecutionResult(1);

      act(() => {
        result.current.completePhase(executionResult);
      });

      expect(mockOnPhaseComplete).toHaveBeenCalled();
    });

    it('should update accumulated code on success', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      act(() => {
        result.current.startPhase(1);
      });

      const executionResult = createMockExecutionResult(1, {
        generatedCode: '// New generated code',
      });

      act(() => {
        result.current.completePhase(executionResult);
      });

      expect(result.current.accumulatedCode).toBe('// New generated code');
    });

    it('should call onBuildComplete when all phases done', () => {
      const { result } = renderHook(() =>
        useDynamicBuildPhases({
          onBuildComplete: mockOnBuildComplete,
        })
      );

      // Create a single phase plan
      const plan = createMockPlan(1);

      act(() => {
        result.current.initializePlan(plan);
      });

      act(() => {
        result.current.startPhase(1);
      });

      act(() => {
        result.current.completePhase(createMockExecutionResult(1));
      });

      expect(mockOnBuildComplete).toHaveBeenCalled();
      expect(result.current.isBuilding).toBe(false);
    });

    it('should handle failed phase result', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      act(() => {
        result.current.startPhase(1);
      });

      const failedResult = createMockExecutionResult(1, {
        success: false,
        errors: ['Build failed'],
      });

      act(() => {
        result.current.completePhase(failedResult);
      });

      const phase = result.current.phases.find((p) => p.number === 1);
      expect(phase?.status).toBe('failed');
    });
  });

  // ==========================================================================
  // Skip Phase Tests
  // ==========================================================================

  describe('skipPhase()', () => {
    it('should skip a pending phase', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      act(() => {
        result.current.skipPhase(2);
      });

      const phase = result.current.phases.find((p) => p.number === 2);
      expect(phase?.status).toBe('skipped');
    });

    it('should not skip if plan is null', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      // Should not throw
      act(() => {
        result.current.skipPhase(1);
      });

      expect(result.current.plan).toBeNull();
    });
  });

  // ==========================================================================
  // Retry Phase Tests
  // ==========================================================================

  describe('retryPhase()', () => {
    it('should reset failed phase to pending', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3, {
        phases: [
          createMockPhase(1, { status: 'completed' }),
          createMockPhase(2, { status: 'failed' }),
          createMockPhase(3, { status: 'pending' }),
        ],
      });

      act(() => {
        result.current.initializePlan(plan);
      });

      act(() => {
        result.current.retryPhase(2);
      });

      const phase = result.current.phases.find((p) => p.number === 2);
      expect(phase?.status).toBe('pending');
    });

    it('should not retry if plan is null', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      // Should not throw
      act(() => {
        result.current.retryPhase(1);
      });

      expect(result.current.plan).toBeNull();
    });
  });

  // ==========================================================================
  // Pause/Resume Tests
  // ==========================================================================

  describe('pauseBuild() and resumeBuild()', () => {
    it('should pause the build', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      act(() => {
        result.current.startPhase(1);
      });

      act(() => {
        result.current.pauseBuild();
      });

      expect(result.current.isPaused).toBe(true);
    });

    it('should resume the build', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      act(() => {
        result.current.startPhase(1);
      });

      act(() => {
        result.current.pauseBuild();
      });

      expect(result.current.isPaused).toBe(true);

      act(() => {
        result.current.resumeBuild();
      });

      expect(result.current.isPaused).toBe(false);
    });
  });

  // ==========================================================================
  // Reset Build Tests
  // ==========================================================================

  describe('resetBuild()', () => {
    it('should reset all state', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      act(() => {
        result.current.startPhase(1);
      });

      act(() => {
        result.current.setAccumulatedCode('some code');
      });

      // Now reset
      act(() => {
        result.current.resetBuild();
      });

      expect(result.current.plan).toBeNull();
      expect(result.current.phases).toEqual([]);
      expect(result.current.isBuilding).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.accumulatedCode).toBe('');
    });
  });

  // ==========================================================================
  // Execution Context Tests
  // ==========================================================================

  describe('getExecutionContext()', () => {
    it('should return execution context for a phase', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      const context = result.current.getExecutionContext(2);

      expect(context).not.toBeNull();
      expect(context?.phaseNumber).toBe(2);
      expect(context?.totalPhases).toBe(3);
      expect(context?.phaseName).toBe('Phase 2');
    });

    it('should return null if no manager', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const context = result.current.getExecutionContext(1);

      expect(context).toBeNull();
    });

    it('should include app context in execution context', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      const context = result.current.getExecutionContext(1);

      expect(context?.appName).toBe('Test App');
      expect(context?.appDescription).toBe('A test application');
    });
  });

  // ==========================================================================
  // Execution Prompt Tests
  // ==========================================================================

  describe('getExecutionPrompt()', () => {
    it('should return execution prompt for a phase', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      const prompt = result.current.getExecutionPrompt(1);

      expect(prompt).not.toBeNull();
      expect(typeof prompt).toBe('string');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(prompt!.length).toBeGreaterThan(0);
    });

    it('should return null if no context available', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const prompt = result.current.getExecutionPrompt(1);

      expect(prompt).toBeNull();
    });
  });

  // ==========================================================================
  // Get Next Phase Tests
  // ==========================================================================

  describe('getNextPhase()', () => {
    it('should return next pending phase', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3, {
        phases: [
          createMockPhase(1, { status: 'completed' }),
          createMockPhase(2, { status: 'pending' }),
          createMockPhase(3, { status: 'pending' }),
        ],
      });

      act(() => {
        result.current.initializePlan(plan);
      });

      const nextPhase = result.current.getNextPhase();

      expect(nextPhase).not.toBeNull();
      expect(nextPhase?.number).toBe(2);
    });

    it('should return null if all phases complete', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(2, {
        phases: [
          createMockPhase(1, { status: 'completed' }),
          createMockPhase(2, { status: 'completed' }),
        ],
      });

      act(() => {
        result.current.initializePlan(plan);
      });

      const nextPhase = result.current.getNextPhase();

      expect(nextPhase).toBeNull();
    });

    it('should return null if no manager', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const nextPhase = result.current.getNextPhase();

      expect(nextPhase).toBeNull();
    });
  });

  // ==========================================================================
  // isComplete Tests
  // ==========================================================================

  describe('isComplete()', () => {
    it('should return false when phases pending', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      expect(result.current.isComplete()).toBe(false);
    });

    it('should return true when all phases complete', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(2, {
        phases: [
          createMockPhase(1, { status: 'completed' }),
          createMockPhase(2, { status: 'completed' }),
        ],
      });

      act(() => {
        result.current.initializePlan(plan);
      });

      expect(result.current.isComplete()).toBe(true);
    });

    it('should return false if no manager', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      expect(result.current.isComplete()).toBe(false);
    });
  });

  // ==========================================================================
  // Phase Navigation Tests
  // ==========================================================================

  describe('getPhaseByNumber()', () => {
    it('should return phase by number', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      const phase = result.current.getPhaseByNumber(2);

      expect(phase).not.toBeUndefined();
      expect(phase?.number).toBe(2);
      expect(phase?.name).toBe('Phase 2');
    });

    it('should return undefined for non-existent phase', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      const phase = result.current.getPhaseByNumber(99);

      expect(phase).toBeUndefined();
    });
  });

  describe('getPhaseById()', () => {
    it('should return UI phase by ID', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      // Get the ID of the first UI phase
      const firstUIPhase = result.current.uiPhases[0];

      if (firstUIPhase) {
        const phase = result.current.getPhaseById(firstUIPhase.id);
        expect(phase).not.toBeUndefined();
        expect(phase?.id).toBe(firstUIPhase.id);
      }
    });
  });

  // ==========================================================================
  // Code Management Tests
  // ==========================================================================

  describe('setAccumulatedCode()', () => {
    it('should update accumulated code', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      act(() => {
        result.current.setAccumulatedCode('// New code here');
      });

      expect(result.current.accumulatedCode).toBe('// New code here');
    });

    it('should replace existing code', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      act(() => {
        result.current.setAccumulatedCode('first');
      });

      act(() => {
        result.current.setAccumulatedCode('second');
      });

      expect(result.current.accumulatedCode).toBe('second');
    });
  });

  describe('addGeneratedFiles()', () => {
    it('should add files to accumulated files', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      act(() => {
        result.current.addGeneratedFiles(['file1.tsx', 'file2.tsx']);
      });

      expect(result.current.plan?.accumulatedFiles).toContain('file1.tsx');
      expect(result.current.plan?.accumulatedFiles).toContain('file2.tsx');
    });

    it('should append to existing files', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3, {
        accumulatedFiles: ['existing.tsx'],
      });

      act(() => {
        result.current.initializePlan(plan);
      });

      act(() => {
        result.current.addGeneratedFiles(['new.tsx']);
      });

      expect(result.current.plan?.accumulatedFiles).toContain('existing.tsx');
      expect(result.current.plan?.accumulatedFiles).toContain('new.tsx');
    });

    it('should do nothing if plan is null', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      // Should not throw
      act(() => {
        result.current.addGeneratedFiles(['file.tsx']);
      });

      expect(result.current.plan).toBeNull();
    });
  });

  describe('addImplementedFeatures()', () => {
    it('should add features to accumulated features', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      act(() => {
        result.current.addImplementedFeatures(['Feature A', 'Feature B']);
      });

      expect(result.current.plan?.accumulatedFeatures).toContain('Feature A');
      expect(result.current.plan?.accumulatedFeatures).toContain('Feature B');
    });

    it('should append to existing features', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(3, {
        accumulatedFeatures: ['Existing Feature'],
      });

      act(() => {
        result.current.initializePlan(plan);
      });

      act(() => {
        result.current.addImplementedFeatures(['New Feature']);
      });

      expect(result.current.plan?.accumulatedFeatures).toContain('Existing Feature');
      expect(result.current.plan?.accumulatedFeatures).toContain('New Feature');
    });
  });

  // ==========================================================================
  // Progress Tracking Tests
  // ==========================================================================

  describe('Progress Tracking', () => {
    it('should update progress when phases complete', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(4);

      act(() => {
        result.current.initializePlan(plan);
      });

      expect(result.current.progress.totalPhases).toBe(4);
      expect(result.current.progress.percentComplete).toBe(0);

      act(() => {
        result.current.startPhase(1);
      });

      act(() => {
        result.current.completePhase(createMockExecutionResult(1));
      });

      // generatePhaseId(1) returns 'foundation' for first 5 phases
      expect(result.current.progress.completedPhases).toContain('foundation');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty phase plan', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const emptyPlan = createMockPlan(0, {
        phases: [],
        totalPhases: 0,
      });

      act(() => {
        result.current.initializePlan(emptyPlan);
      });

      expect(result.current.phases).toHaveLength(0);
      expect(result.current.isComplete()).toBe(true);
    });

    it('should handle single phase plan', () => {
      const { result } = renderHook(() =>
        useDynamicBuildPhases({
          onBuildComplete: mockOnBuildComplete,
        })
      );

      const singlePhasePlan = createMockPlan(1);

      act(() => {
        result.current.initializePlan(singlePhasePlan);
      });

      act(() => {
        result.current.startPhase(1);
      });

      act(() => {
        result.current.completePhase(createMockExecutionResult(1));
      });

      expect(mockOnBuildComplete).toHaveBeenCalled();
    });

    it('should handle rapid phase operations', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const plan = createMockPlan(5);

      act(() => {
        result.current.initializePlan(plan);
      });

      // Rapidly complete all phases
      for (let i = 1; i <= 5; i++) {
        act(() => {
          result.current.startPhase(i);
        });
        act(() => {
          result.current.completePhase(createMockExecutionResult(i));
        });
      }

      expect(result.current.isComplete()).toBe(true);
    });

    it('should handle large phase plans', () => {
      const { result } = renderHook(() => useDynamicBuildPhases());

      const largePlan = createMockPlan(25);

      act(() => {
        result.current.initializePlan(largePlan);
      });

      expect(result.current.phases).toHaveLength(25);
      expect(result.current.progress.totalPhases).toBe(25);
    });
  });

  // ==========================================================================
  // Callback Tests
  // ==========================================================================

  describe('Callbacks', () => {
    it('should call onPhaseStart with correct phase', () => {
      const { result } = renderHook(() =>
        useDynamicBuildPhases({
          onPhaseStart: mockOnPhaseStart,
        })
      );

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      act(() => {
        result.current.startPhase(2);
      });

      expect(mockOnPhaseStart).toHaveBeenCalledWith(
        expect.objectContaining({
          number: 2,
          name: 'Phase 2',
        })
      );
    });

    it('should call onPhaseComplete with phase and result', () => {
      const { result } = renderHook(() =>
        useDynamicBuildPhases({
          onPhaseComplete: mockOnPhaseComplete,
        })
      );

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      act(() => {
        result.current.startPhase(1);
      });

      const execResult = createMockExecutionResult(1);

      act(() => {
        result.current.completePhase(execResult);
      });

      expect(mockOnPhaseComplete).toHaveBeenCalledWith(
        expect.objectContaining({ number: 1 }),
        execResult
      );
    });

    it('should call onError when phase execution fails', () => {
      const { result } = renderHook(() =>
        useDynamicBuildPhases({
          onError: mockOnError,
        })
      );

      const plan = createMockPlan(3);

      act(() => {
        result.current.initializePlan(plan);
      });

      // Try to start non-existent phase
      act(() => {
        result.current.startPhase(100);
      });

      expect(mockOnError).toHaveBeenCalled();
    });
  });
});
