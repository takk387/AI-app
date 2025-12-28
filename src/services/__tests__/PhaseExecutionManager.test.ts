/**
 * PhaseExecutionManager Service Tests
 *
 * Tests the phase execution types and utility functions.
 * Due to complex internal dependencies (DynamicPhaseGenerator, CodeContextService),
 * we focus on testing the exported interfaces and helper functions.
 */

import { formatLayoutDesignForPrompt, type OperationResult } from '../PhaseExecutionManager';
import type {
  DynamicPhasePlan,
  DynamicPhase,
  PhaseExecutionContext,
  PhaseExecutionResult,
} from '@/types/dynamicPhases';
import type { LayoutDesign } from '@/types/layoutDesign';
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
        name: 'Authentication',
        description: 'User login and registration',
        priority: 'must-have',
        complexity: 'moderate',
      },
      {
        name: 'Dashboard',
        description: 'Main dashboard view',
        priority: 'must-have',
        complexity: 'simple',
      },
    ],
    uiPreferences: {
      style: 'modern',
      colorScheme: 'dark',
      responsiveness: 'fully-responsive',
    },
    technical: {
      needsAuth: true,
      needsDatabase: true,
      needsAPI: true,
      preferredStack: 'react',
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
    totalPhases: 3,
    estimatedTotalTokens: 10000,
    phases: [
      createMockPhase({ number: 1, name: 'Setup' }),
      createMockPhase({ number: 2, name: 'Core Features', dependencies: [1] }),
      createMockPhase({ number: 3, name: 'Polish', dependencies: [1, 2] }),
    ],
    concept: createMockAppConcept(),
    contextStrategy: 'sliding_window',
    createdAt: new Date().toISOString(),
  };
}

function createMockLayoutDesign(): LayoutDesign {
  return {
    globalStyles: {
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
      typography: {
        fontFamily: 'Inter',
        headingFont: 'Inter',
        headingWeight: 'semibold',
        bodyWeight: 'normal',
        headingSize: 'lg',
        bodySize: 'base',
        lineHeight: 'normal',
        letterSpacing: 'normal',
      },
      spacing: {
        density: 'normal',
        sectionPadding: 'lg',
        containerWidth: 'standard',
        componentGap: 'md',
      },
      effects: {
        borderRadius: 'lg',
        shadows: 'medium',
        blur: 'none',
        gradients: false,
        animations: 'smooth',
      },
    },
    components: {
      buttons: { style: 'solid', size: 'md' },
      inputs: { style: 'bordered', size: 'md' },
      cards: { style: 'elevated', padding: 'md' },
    },
    structure: {
      type: 'dashboard',
      hasHeader: true,
      hasSidebar: true,
      hasFooter: true,
      sidebarPosition: 'left',
      headerType: 'fixed',
      contentLayout: 'fluid',
      mainContentWidth: 'full',
    },
    responsive: {
      mobileBreakpoint: 640,
      tabletBreakpoint: 1024,
      mobileLayout: 'stack',
    },
  } as LayoutDesign;
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
    expect(plan.contextStrategy).toBe('sliding_window');
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
    const inProgressPhase = createMockPhase({ status: 'in_progress' });
    const completedPhase = createMockPhase({ status: 'completed' });

    expect(pendingPhase.status).toBe('pending');
    expect(inProgressPhase.status).toBe('in_progress');
    expect(completedPhase.status).toBe('completed');
  });
});

describe('PhaseExecutionResult Interface', () => {
  test('successful result has correct structure', () => {
    const result: PhaseExecutionResult = {
      phaseNumber: 1,
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
      success: false,
      generatedCode: '',
      generatedFiles: [],
      implementedFeatures: [],
      tokensUsed: { input: 500, output: 0 },
      duration: 2000,
      error: 'API timeout',
    };

    expect(result.success).toBe(false);
    expect(result.error).toBe('API timeout');
  });
});

describe('PhaseExecutionContext Interface', () => {
  test('has correct structure', () => {
    const phase = createMockPhase();
    const context: PhaseExecutionContext = {
      phaseNumber: 1,
      phaseName: 'Setup',
      features: ['project-structure'],
      testCriteria: ['Project runs'],
      previousPhaseCode: '',
      allPhases: [phase],
      completedPhases: [],
      fullConcept: createMockAppConcept(),
      totalPhases: 3,
      estimatedTokens: 3000,
      phase,
    };

    expect(context.phaseNumber).toBe(1);
    expect(context.phaseName).toBe('Setup');
    expect(context.fullConcept.name).toBe('Test App');
    expect(context.totalPhases).toBe(3);
  });

  test('supports layout design', () => {
    const phase = createMockPhase();
    const context: PhaseExecutionContext = {
      phaseNumber: 1,
      phaseName: 'Setup',
      features: [],
      testCriteria: [],
      previousPhaseCode: '',
      allPhases: [phase],
      completedPhases: [],
      fullConcept: createMockAppConcept(),
      totalPhases: 1,
      estimatedTokens: 1000,
      phase,
      layoutDesign: createMockLayoutDesign(),
    };

    expect(context.layoutDesign).toBeDefined();
    expect(context.layoutDesign?.globalStyles.colors.primary).toBe('#3B82F6');
  });

  test('supports previous phase code', () => {
    const phase = createMockPhase();
    const context: PhaseExecutionContext = {
      phaseNumber: 2,
      phaseName: 'Core Features',
      features: ['auth'],
      testCriteria: ['Login works'],
      previousPhaseCode: '// Previous code\nexport default function App() {}',
      allPhases: [phase],
      completedPhases: [{ number: 1, name: 'Setup' }],
      fullConcept: createMockAppConcept(),
      totalPhases: 3,
      estimatedTokens: 5000,
      phase,
    };

    expect(context.previousPhaseCode).toContain('Previous code');
    expect(context.completedPhases).toHaveLength(1);
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('formatLayoutDesignForPrompt', () => {
  test('formats layout design into prompt string', () => {
    const design = createMockLayoutDesign();

    const formatted = formatLayoutDesignForPrompt(design);

    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
  });

  test('includes color specifications', () => {
    const design = createMockLayoutDesign();

    const formatted = formatLayoutDesignForPrompt(design);

    expect(formatted).toContain('#3B82F6'); // Primary color
    expect(formatted).toContain('#111827'); // Background color
  });

  test('includes typography specifications', () => {
    const design = createMockLayoutDesign();

    const formatted = formatLayoutDesignForPrompt(design);

    expect(formatted).toContain('Inter'); // Font family
    expect(formatted).toContain('semibold'); // Heading weight
  });

  test('includes spacing specifications', () => {
    const design = createMockLayoutDesign();

    const formatted = formatLayoutDesignForPrompt(design);

    expect(formatted).toContain('Spacing'); // Section header
    expect(formatted).toContain('normal'); // Density
  });

  test('includes effects specifications', () => {
    const design = createMockLayoutDesign();

    const formatted = formatLayoutDesignForPrompt(design);

    expect(formatted).toContain('Border Radius');
    expect(formatted).toContain('Shadows');
  });

  test('includes structure specifications', () => {
    const design = createMockLayoutDesign();

    const formatted = formatLayoutDesignForPrompt(design);

    expect(formatted).toContain('dashboard'); // Structure type
    expect(formatted).toContain('Header');
    expect(formatted).toContain('Sidebar');
  });

  test('includes responsive settings', () => {
    const design = createMockLayoutDesign();

    const formatted = formatLayoutDesignForPrompt(design);

    expect(formatted).toContain('640'); // Mobile breakpoint
    expect(formatted).toContain('1024'); // Tablet breakpoint
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
