/**
 * PhaseExecutionManager Service Tests
 *
 * Tests the phase execution types and utility functions.
 * Due to complex internal dependencies (DynamicPhaseGenerator, CodeContextService),
 * we focus on testing the exported interfaces and helper functions.
 */

import { formatLayoutManifestForPrompt, type OperationResult } from '../PhaseExecutionManager';
import type {
  DynamicPhasePlan,
  DynamicPhase,
  PhaseExecutionContext,
  PhaseExecutionResult,
} from '@/types/dynamicPhases';
import type { LayoutManifest } from '@/types/schema';
import type { AppConcept } from '@/types/appConcept';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMockAppConcept(): AppConcept {
  return {
    name: 'Test App',
    description: 'A test application',
    purpose: 'Testing',
    targetUsers: 'Developers',
    coreFeatures: [
      {
        id: 'auth',
        name: 'Authentication',
        description: 'User login and registration',
        priority: 'high',
      },
      {
        id: 'dashboard',
        name: 'Dashboard',
        description: 'Main dashboard view',
        priority: 'high',
      },
    ],
    uiPreferences: {
      style: 'modern',
      colorScheme: 'dark',
      layout: 'dashboard',
    },
    technical: {
      needsAuth: true,
      needsDatabase: true,
      needsAPI: true,
      needsFileUpload: false,
      needsRealtime: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createMockPhase(overrides: Partial<DynamicPhase> = {}): DynamicPhase {
  return {
    number: 1,
    name: 'Setup & Foundation',
    description: 'Initial project setup',
    domain: 'setup',
    features: ['project-structure', 'dependencies'],
    featureDetails: [],
    estimatedTokens: 3000,
    estimatedTime: '5 min',
    dependencies: [],
    dependencyNames: [],
    testCriteria: ['Project runs', 'Dependencies installed'],
    status: 'pending',
    ...overrides,
  };
}

function createMockPhasePlan(): DynamicPhasePlan {
  return {
    id: 'plan-123',
    appName: 'Test App',
    appDescription: 'A test application',
    totalPhases: 3,
    estimatedTotalTokens: 10000,
    estimatedTotalTime: '15 min',
    phases: [
      createMockPhase({ number: 1, name: 'Setup' }),
      createMockPhase({ number: 2, name: 'Core Features', dependencies: [1] }),
      createMockPhase({ number: 3, name: 'Polish', dependencies: [1, 2] }),
    ],
    complexity: 'moderate',
    concept: createMockAppConcept(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentPhaseNumber: 1,
    completedPhaseNumbers: [],
    failedPhaseNumbers: [],
    accumulatedFiles: [],
    accumulatedFeatures: [],
  };
}

function createMockLayoutManifest(): LayoutManifest {
  return {
    id: 'layout-123',
    version: '1.0.0',
    root: {
      id: 'root',
      type: 'container',
      semanticTag: 'root',
      attributes: {},
      styles: {
        tailwindClasses: 'min-h-screen flex flex-col bg-background text-text',
      },
      children: [
        {
          id: 'header',
          type: 'container',
          semanticTag: 'header',
          attributes: {},
          styles: { tailwindClasses: 'w-full bg-surface border-b border-border sticky top-0' },
        },
        {
          id: 'main',
          type: 'container',
          semanticTag: 'main',
          attributes: {},
          styles: { tailwindClasses: 'flex flex-1' },
          children: [
            {
              id: 'sidebar',
              type: 'container',
              semanticTag: 'sidebar',
              attributes: {},
              styles: { tailwindClasses: 'w-64 bg-surface border-r border-border' },
            },
            {
              id: 'content',
              type: 'container',
              semanticTag: 'content-section',
              attributes: {},
              styles: { tailwindClasses: 'flex-1 p-8' },
            },
          ],
        },
      ],
    },
    definitions: {},
    detectedFeatures: ['dashboard', 'sidebar', 'header'],
    designSystem: {
      colors: {
        primary: '#3B82F6',
        secondary: '#6366F1',
        accent: '#F59E0B',
        background: '#111827',
        surface: '#1F2937',
        text: '#F9FAFB',
        textMuted: '#9CA3AF',
        border: '#374151',
      },
      fonts: {
        heading: 'Inter',
        body: 'Inter',
      },
    },
  };
}

// ============================================================================
// TYPE INTERFACE TESTS
// ============================================================================

describe('DynamicPhasePlan Interface', () => {
  test('has correct structure', () => {
    const plan = createMockPhasePlan();

    expect(plan.totalPhases).toBe(3);
    expect(plan.phases).toHaveLength(3);
    expect(plan.concept).toBeDefined();
    expect(plan.complexity).toBe('moderate');
  });

  test('phases have correct numbering', () => {
    const plan = createMockPhasePlan();

    plan.phases.forEach((phase, index) => {
      expect(phase.number).toBe(index + 1);
    });
  });

  test('supports completed phase tracking', () => {
    const plan = createMockPhasePlan();
    plan.completedPhaseNumbers = [1, 2];

    expect(plan.completedPhaseNumbers).toContain(1);
    expect(plan.completedPhaseNumbers).toContain(2);
    expect(plan.completedPhaseNumbers).not.toContain(3);
  });
});

describe('DynamicPhase Interface', () => {
  test('has correct structure', () => {
    const phase = createMockPhase();

    expect(phase.number).toBe(1);
    expect(phase.name).toBe('Setup & Foundation');
    expect(phase.domain).toBe('setup');
    expect(phase.features).toContain('project-structure');
    expect(phase.testCriteria).toContain('Project runs');
    expect(phase.status).toBe('pending');
  });

  test('supports dependencies', () => {
    const phase = createMockPhase({
      number: 2,
      dependencies: [1],
      dependencyNames: ['Setup'],
    });

    expect(phase.dependencies).toContain(1);
    expect(phase.dependencyNames).toContain('Setup');
  });

  test('supports different statuses', () => {
    const pendingPhase = createMockPhase({ status: 'pending' });
    const inProgressPhase = createMockPhase({ status: 'in-progress' });
    const completedPhase = createMockPhase({ status: 'completed' });

    expect(pendingPhase.status).toBe('pending');
    expect(inProgressPhase.status).toBe('in-progress');
    expect(completedPhase.status).toBe('completed');
  });
});

describe('PhaseExecutionResult Interface', () => {
  test('successful result has correct structure', () => {
    const result: PhaseExecutionResult = {
      phaseNumber: 1,
      phaseName: 'Setup',
      success: true,
      generatedCode: '// Generated code',
      generatedFiles: ['src/App.tsx', 'src/index.tsx'],
      implementedFeatures: ['setup', 'routing'],
      tokensUsed: { input: 1000, output: 500 },
      duration: 5000,
    };

    expect(result.success).toBe(true);
    expect(result.generatedFiles).toHaveLength(2);
    expect(result.tokensUsed.input).toBe(1000);
    expect(result.duration).toBe(5000);
  });

  test('failed result has error info', () => {
    const result: PhaseExecutionResult = {
      phaseNumber: 1,
      phaseName: 'Setup',
      success: false,
      generatedCode: '',
      generatedFiles: [],
      implementedFeatures: [],
      tokensUsed: { input: 500, output: 0 },
      duration: 2000,
      errors: ['API timeout'],
    };

    expect(result.success).toBe(false);
    expect(result.errors).toContain('API timeout');
  });
});

describe('PhaseExecutionContext Interface', () => {
  test('has correct structure', () => {
    const phase = createMockPhase();
    const context: PhaseExecutionContext = {
      phaseNumber: 1,
      phaseName: 'Setup',
      phaseDescription: 'Initial project setup',
      features: ['project-structure'],
      testCriteria: ['Project runs'],
      previousPhaseCode: '',
      allPhases: [phase],
      completedPhases: [],
      cumulativeFeatures: [],
      cumulativeFiles: [],
      appName: 'Test App',
      appDescription: 'A test application',
      appType: 'FRONTEND_ONLY',
      techStack: {
        needsAuth: true,
        needsDatabase: true,
        needsAPI: true,
        needsFileUpload: false,
        needsRealtime: false,
      },
      totalPhases: 3,
    };

    expect(context.phaseNumber).toBe(1);
    expect(context.phaseName).toBe('Setup');
    expect(context.appName).toBe('Test App');
    expect(context.totalPhases).toBe(3);
  });

  test('supports layout manifest via fullConcept', () => {
    const phase = createMockPhase();
    const mockLayoutManifest = createMockLayoutManifest();
    const context: PhaseExecutionContext = {
      phaseNumber: 1,
      phaseName: 'Setup',
      phaseDescription: 'Initial project setup',
      features: [],
      testCriteria: [],
      previousPhaseCode: '',
      allPhases: [phase],
      completedPhases: [],
      cumulativeFeatures: [],
      cumulativeFiles: [],
      appName: 'Test App',
      appDescription: 'A test application',
      appType: 'FRONTEND_ONLY',
      techStack: {
        needsAuth: true,
        needsDatabase: true,
        needsAPI: true,
        needsFileUpload: false,
        needsRealtime: false,
      },
      totalPhases: 1,
      fullConcept: {
        layoutManifest: mockLayoutManifest,
      },
    };

    expect(context.fullConcept?.layoutManifest).toBeDefined();
    expect(context.fullConcept?.layoutManifest?.designSystem.colors.primary).toBe('#3B82F6');
  });

  test('supports previous phase code', () => {
    const phase = createMockPhase();
    const context: PhaseExecutionContext = {
      phaseNumber: 2,
      phaseName: 'Core Features',
      phaseDescription: 'Core feature implementation',
      features: ['auth'],
      testCriteria: ['Login works'],
      previousPhaseCode: '// Previous code\nexport default function App() {}',
      allPhases: [phase],
      completedPhases: [1],
      cumulativeFeatures: ['setup'],
      cumulativeFiles: ['src/App.tsx'],
      appName: 'Test App',
      appDescription: 'A test application',
      appType: 'FRONTEND_ONLY',
      techStack: {
        needsAuth: true,
        needsDatabase: true,
        needsAPI: true,
        needsFileUpload: false,
        needsRealtime: false,
      },
      totalPhases: 3,
    };

    expect(context.previousPhaseCode).toContain('Previous code');
    expect(context.completedPhases).toHaveLength(1);
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('formatLayoutManifestForPrompt', () => {
  test('formats layout manifest into prompt string', () => {
    const manifest = createMockLayoutManifest();

    const formatted = formatLayoutManifestForPrompt(manifest);

    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
  });

  test('includes color specifications', () => {
    const manifest = createMockLayoutManifest();

    const formatted = formatLayoutManifestForPrompt(manifest);

    expect(formatted).toContain('#3B82F6'); // Primary color
    expect(formatted).toContain('#111827'); // Background color
  });

  test('includes typography specifications', () => {
    const manifest = createMockLayoutManifest();

    const formatted = formatLayoutManifestForPrompt(manifest);

    expect(formatted).toContain('Inter'); // Font family
  });

  test('includes detected features', () => {
    const manifest = createMockLayoutManifest();

    const formatted = formatLayoutManifestForPrompt(manifest);

    expect(formatted).toContain('dashboard');
    expect(formatted).toContain('sidebar');
    expect(formatted).toContain('header');
  });
});

describe('OperationResult type', () => {
  test('success result has correct structure', () => {
    const result: OperationResult<string> = {
      status: 'success',
      data: 'test data',
    };

    expect(result.status).toBe('success');
    expect(result.data).toBe('test data');
  });

  test('skipped result has correct structure', () => {
    const result: OperationResult<string> = {
      status: 'skipped',
      reason: 'Not needed',
    };

    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('Not needed');
  });

  test('error result has correct structure', () => {
    const result: OperationResult<string> = {
      status: 'error',
      error: 'Something went wrong',
      details: { code: 500 },
    };

    expect(result.status).toBe('error');
    expect(result.error).toBe('Something went wrong');
    expect(result.details).toEqual({ code: 500 });
  });
});

// ============================================================================
// EXECUTION LOGIC TESTS
// ============================================================================

describe('Phase Dependency Logic', () => {
  test('phase without dependencies can run immediately', () => {
    const phase = createMockPhase({ dependencies: [] });
    const completedPhases: number[] = [];

    const canRun = phase.dependencies.every((dep) => completedPhases.includes(dep));

    expect(canRun).toBe(true);
  });

  test('phase with dependencies requires completion', () => {
    const phase = createMockPhase({ number: 2, dependencies: [1] });
    const completedPhases: number[] = [];

    const canRun = phase.dependencies.every((dep) => completedPhases.includes(dep));

    expect(canRun).toBe(false);
  });

  test('phase with satisfied dependencies can run', () => {
    const phase = createMockPhase({ number: 2, dependencies: [1] });
    const completedPhases = [1];

    const canRun = phase.dependencies.every((dep) => completedPhases.includes(dep));

    expect(canRun).toBe(true);
  });

  test('phase with multiple dependencies requires all', () => {
    const phase = createMockPhase({ number: 3, dependencies: [1, 2] });
    const partialCompletion = [1];
    const fullCompletion = [1, 2];

    const canRunPartial = phase.dependencies.every((dep) => partialCompletion.includes(dep));
    const canRunFull = phase.dependencies.every((dep) => fullCompletion.includes(dep));

    expect(canRunPartial).toBe(false);
    expect(canRunFull).toBe(true);
  });
});

describe('Phase Progress Calculation', () => {
  test('calculates completion percentage', () => {
    const totalPhases = 5;
    const completedPhases = 2;

    const percentage = Math.round((completedPhases / totalPhases) * 100);

    expect(percentage).toBe(40);
  });

  test('handles zero phases', () => {
    const totalPhases = 0;
    const completedPhases = 0;

    const percentage = totalPhases === 0 ? 0 : Math.round((completedPhases / totalPhases) * 100);

    expect(percentage).toBe(0);
  });

  test('handles all phases completed', () => {
    const totalPhases = 3;
    const completedPhases = 3;

    const percentage = Math.round((completedPhases / totalPhases) * 100);

    expect(percentage).toBe(100);
  });
});

describe('Token Estimation', () => {
  test('sums phase token estimates', () => {
    const phases = [
      createMockPhase({ estimatedTokens: 3000 }),
      createMockPhase({ estimatedTokens: 5000 }),
      createMockPhase({ estimatedTokens: 2000 }),
    ];

    const totalTokens = phases.reduce((sum, phase) => sum + phase.estimatedTokens, 0);

    expect(totalTokens).toBe(10000);
  });

  test('tracks actual token usage vs estimated', () => {
    const estimatedTokens = 5000;
    const actualTokens = { input: 4500, output: 1500 };
    const totalActual = actualTokens.input + actualTokens.output;

    const overUnder = totalActual - estimatedTokens;
    const isOverBudget = totalActual > estimatedTokens;

    expect(totalActual).toBe(6000);
    expect(overUnder).toBe(1000);
    expect(isOverBudget).toBe(true);
  });
});

describe('Next Phase Selection', () => {
  test('selects first pending phase', () => {
    const phases = [
      createMockPhase({ number: 1, status: 'completed' }),
      createMockPhase({ number: 2, status: 'pending' }),
      createMockPhase({ number: 3, status: 'pending' }),
    ];

    const nextPhase = phases.find((p) => p.status === 'pending');

    expect(nextPhase?.number).toBe(2);
  });

  test('returns undefined when all completed', () => {
    const phases = [
      createMockPhase({ number: 1, status: 'completed' }),
      createMockPhase({ number: 2, status: 'completed' }),
    ];

    const nextPhase = phases.find((p) => p.status === 'pending');

    expect(nextPhase).toBeUndefined();
  });

  test('respects dependencies when selecting next', () => {
    const phases = [
      createMockPhase({ number: 1, status: 'pending', dependencies: [] }),
      createMockPhase({ number: 2, status: 'pending', dependencies: [1] }),
    ];
    const completedPhases: number[] = [];

    const eligiblePhases = phases.filter(
      (p) => p.status === 'pending' && p.dependencies.every((dep) => completedPhases.includes(dep))
    );

    expect(eligiblePhases).toHaveLength(1);
    expect(eligiblePhases[0].number).toBe(1);
  });
});
