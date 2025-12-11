/**
 * Unit Tests for BuildQualityEnforcer Service
 *
 * Tests folder structure templates, pre-generation checks,
 * post-generation validations, and quality enforcement logic.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
  BuildQualityEnforcer,
  FOLDER_STRUCTURE_TEMPLATES,
  CODE_ORGANIZATION_PATTERNS,
  PRE_GENERATION_CHECKS,
  POST_GENERATION_VALIDATIONS,
  createQualityEnforcer,
  getFolderStructureForAppType,
  getCodeOrganizationPatterns,
  type PreGenerationContext,
} from '../BuildQualityEnforcer';
import type { ReviewFile, QualityReport } from '@/types/codeReview';
import type { DynamicPhasePlan } from '@/types/dynamicPhases';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a mock ReviewFile
 */
function createMockFile(path: string, content: string): ReviewFile {
  const languageMap: Record<string, string> = {
    '.tsx': 'typescript',
    '.ts': 'typescript',
    '.jsx': 'javascript',
    '.js': 'javascript',
    '.css': 'css',
    '.scss': 'scss',
    '.json': 'json',
    '.md': 'markdown',
  };

  const ext = path.slice(path.lastIndexOf('.'));
  const language = languageMap[ext] || 'text';

  return {
    path,
    content,
    language,
  };
}

/**
 * Create a mock PreGenerationContext
 */
function createMockPreGenContext(
  overrides?: Partial<PreGenerationContext>
): PreGenerationContext {
  return {
    phaseNumber: 1,
    phaseName: 'Test Phase',
    features: ['Feature A', 'Feature B'],
    existingFiles: [],
    appType: 'FRONTEND_ONLY',
    ...overrides,
  };
}

/**
 * Create a mock QualityReport
 */
function createMockQualityReport(
  overrides?: Partial<QualityReport>
): QualityReport {
  return {
    timestamp: new Date().toISOString(),
    reviewType: 'light',
    totalIssues: 2,
    fixedIssues: 1,
    remainingIssues: 1,
    issuesByCategory: { syntax_error: 1 },
    issuesBySeverity: { critical: 1, high: 0, medium: 0, low: 0 },
    scores: {
      syntax: 75,
      security: 100,
      bestPractices: 80,
      performance: 90,
      accessibility: 85,
    },
    overallScore: 85,
    passed: true,
    issues: [
      {
        id: 'test-issue-1',
        category: 'syntax_error',
        severity: 'critical',
        file: 'src/App.tsx',
        message: 'Missing semicolon',
        autoFixable: true,
      },
    ],
    fixes: [],
    validationComplete: true,
    reviewComplete: true,
    durationMs: 100,
    ...overrides,
  };
}

// ============================================================================
// Folder Structure Templates Tests
// ============================================================================

describe('FOLDER_STRUCTURE_TEMPLATES', () => {
  it('should have FRONTEND_ONLY template', () => {
    expect(FOLDER_STRUCTURE_TEMPLATES.FRONTEND_ONLY).toBeDefined();
    expect(FOLDER_STRUCTURE_TEMPLATES.FRONTEND_ONLY.description).toContain('client-side');
    expect(FOLDER_STRUCTURE_TEMPLATES.FRONTEND_ONLY.requiredFiles).toContain('src/App.tsx');
    expect(FOLDER_STRUCTURE_TEMPLATES.FRONTEND_ONLY.structure.length).toBeGreaterThan(0);
    expect(FOLDER_STRUCTURE_TEMPLATES.FRONTEND_ONLY.guidelines.length).toBeGreaterThan(0);
  });

  it('should have FULL_STACK template', () => {
    expect(FOLDER_STRUCTURE_TEMPLATES.FULL_STACK).toBeDefined();
    expect(FOLDER_STRUCTURE_TEMPLATES.FULL_STACK.description).toContain('full-stack');
    expect(FOLDER_STRUCTURE_TEMPLATES.FULL_STACK.requiredFiles).toContain('src/app/layout.tsx');
    expect(FOLDER_STRUCTURE_TEMPLATES.FULL_STACK.structure).toContain('src/app/api/');
  });

  it('should have DASHBOARD template', () => {
    expect(FOLDER_STRUCTURE_TEMPLATES.DASHBOARD).toBeDefined();
    expect(FOLDER_STRUCTURE_TEMPLATES.DASHBOARD.description).toContain('dashboard');
    expect(FOLDER_STRUCTURE_TEMPLATES.DASHBOARD.structure).toContain('src/components/charts/');
  });
});

// ============================================================================
// Code Organization Patterns Tests
// ============================================================================

describe('CODE_ORGANIZATION_PATTERNS', () => {
  it('should have COMPONENT pattern', () => {
    expect(CODE_ORGANIZATION_PATTERNS.COMPONENT).toBeDefined();
    expect(CODE_ORGANIZATION_PATTERNS.COMPONENT.imports).toBeDefined();
    expect(CODE_ORGANIZATION_PATTERNS.COMPONENT.types).toBeDefined();
    expect(CODE_ORGANIZATION_PATTERNS.COMPONENT.hooks).toBeDefined();
  });

  it('should have API_ROUTE pattern', () => {
    expect(CODE_ORGANIZATION_PATTERNS.API_ROUTE).toBeDefined();
    expect(CODE_ORGANIZATION_PATTERNS.API_ROUTE.validation).toBeDefined();
    expect(CODE_ORGANIZATION_PATTERNS.API_ROUTE.errorHandling).toBeDefined();
  });

  it('should have HOOK pattern', () => {
    expect(CODE_ORGANIZATION_PATTERNS.HOOK).toBeDefined();
    expect(CODE_ORGANIZATION_PATTERNS.HOOK.naming).toContain('use');
  });

  it('should have TYPES pattern', () => {
    expect(CODE_ORGANIZATION_PATTERNS.TYPES).toBeDefined();
    expect(CODE_ORGANIZATION_PATTERNS.TYPES.naming).toContain('PascalCase');
  });
});

// ============================================================================
// Pre-Generation Checks Tests
// ============================================================================

describe('PRE_GENERATION_CHECKS', () => {
  it('should have structure setup check', () => {
    const structureCheck = PRE_GENERATION_CHECKS.find((c) => c.name === 'Structure Setup');
    expect(structureCheck).toBeDefined();
  });

  it('should have design system check', () => {
    const designCheck = PRE_GENERATION_CHECKS.find((c) => c.name === 'Design System');
    expect(designCheck).toBeDefined();
  });

  it('should have type safety check', () => {
    const typeCheck = PRE_GENERATION_CHECKS.find((c) => c.name === 'Type Safety');
    expect(typeCheck).toBeDefined();
  });

  it('should pass structure check for phase 1', () => {
    const check = PRE_GENERATION_CHECKS.find((c) => c.name === 'Structure Setup')!;
    const ctx = createMockPreGenContext({ phaseNumber: 1, existingFiles: [] });
    const result = check.check(ctx);

    expect(result.passed).toBe(true);
    expect(result.requiredActions.length).toBeGreaterThan(0);
  });

  it('should warn about missing structure files in later phases', () => {
    const check = PRE_GENERATION_CHECKS.find((c) => c.name === 'Structure Setup')!;
    const ctx = createMockPreGenContext({
      phaseNumber: 3,
      existingFiles: [],
      appType: 'FRONTEND_ONLY',
    });
    const result = check.check(ctx);

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Missing required files');
  });

  it('should pass structure check when files exist', () => {
    const check = PRE_GENERATION_CHECKS.find((c) => c.name === 'Structure Setup')!;
    const ctx = createMockPreGenContext({
      phaseNumber: 3,
      existingFiles: ['App.tsx', 'index.css'],
      appType: 'FRONTEND_ONLY',
    });
    const result = check.check(ctx);

    expect(result.passed).toBe(true);
    expect(result.warnings.length).toBe(0);
  });

  it('should warn about missing CSS when design system is specified', () => {
    const check = PRE_GENERATION_CHECKS.find((c) => c.name === 'Design System')!;
    const ctx = createMockPreGenContext({
      layoutDesign: true,
      existingFiles: ['App.tsx'],
    });
    const result = check.check(ctx);

    expect(result.passed).toBe(false);
    expect(result.warnings).toContain('Design system specified but no CSS file found');
  });

  it('should pass design check when CSS exists', () => {
    const check = PRE_GENERATION_CHECKS.find((c) => c.name === 'Design System')!;
    const ctx = createMockPreGenContext({
      layoutDesign: true,
      existingFiles: ['App.tsx', 'globals.css'],
    });
    const result = check.check(ctx);

    expect(result.passed).toBe(true);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('should warn about missing types in later phases', () => {
    const check = PRE_GENERATION_CHECKS.find((c) => c.name === 'Type Safety')!;
    const ctx = createMockPreGenContext({
      phaseNumber: 4,
      existingFiles: ['App.tsx', 'index.css'],
    });
    const result = check.check(ctx);

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('types');
  });
});

// ============================================================================
// Post-Generation Validations Tests
// ============================================================================

describe('POST_GENERATION_VALIDATIONS', () => {
  it('should detect mixed import styles', () => {
    const validation = POST_GENERATION_VALIDATIONS.find((v) => v.name === 'Consistent Imports')!;
    const files = [
      createMockFile(
        'src/Component.tsx',
        `
import { Button } from '@/components/ui';
import Helper from '../utils/helper';
`
      ),
    ];

    const result = validation.check(files);
    expect(result.passed).toBe(false);
    expect(result.issues[0].message).toContain('Mixed import styles');
  });

  it('should pass when imports are consistent', () => {
    const validation = POST_GENERATION_VALIDATIONS.find((v) => v.name === 'Consistent Imports')!;
    const files = [
      createMockFile(
        'src/Component.tsx',
        `
import { Button } from '@/components/ui';
import { helper } from '@/utils/helper';
`
      ),
    ];

    const result = validation.check(files);
    expect(result.passed).toBe(true);
  });

  it('should suggest error boundaries for async code', () => {
    const validation = POST_GENERATION_VALIDATIONS.find(
      (v) => v.name === 'Missing Error Boundaries'
    )!;
    const files = [
      createMockFile(
        'src/Component.tsx',
        `
async function fetchData() {
  const response = await fetch('/api');
  return response.json();
}
`
      ),
    ];

    const result = validation.check(files);
    expect(result.passed).toBe(false);
    expect(result.issues[0].message).toContain('error boundary');
  });

  it('should pass when error boundary exists', () => {
    const validation = POST_GENERATION_VALIDATIONS.find(
      (v) => v.name === 'Missing Error Boundaries'
    )!;
    const files = [
      createMockFile(
        'src/Component.tsx',
        `
async function fetchData() {
  await fetch('/api');
}
`
      ),
      createMockFile('src/error.tsx', 'export default function ErrorBoundary() {}'),
    ];

    const result = validation.check(files);
    expect(result.passed).toBe(true);
  });

  it('should detect hardcoded URLs', () => {
    const validation = POST_GENERATION_VALIDATIONS.find((v) => v.name === 'Hardcoded Values')!;
    const files = [
      createMockFile(
        'src/api.tsx',
        `
const API_URL = 'https://api.example.com/v1';
fetch(API_URL);
`
      ),
    ];

    const result = validation.check(files);
    expect(result.passed).toBe(false);
    expect(result.issues[0].message).toContain('Hardcoded API URL');
  });

  it('should allow localhost URLs', () => {
    const validation = POST_GENERATION_VALIDATIONS.find((v) => v.name === 'Hardcoded Values')!;
    const files = [
      createMockFile(
        'src/api.tsx',
        `
const API_URL = 'http://localhost:3000/api';
fetch(API_URL);
`
      ),
    ];

    const result = validation.check(files);
    expect(result.passed).toBe(true);
  });
});

// ============================================================================
// BuildQualityEnforcer Class Tests
// ============================================================================

describe('BuildQualityEnforcer', () => {
  let enforcer: BuildQualityEnforcer;

  beforeEach(() => {
    enforcer = new BuildQualityEnforcer('standard', 'FRONTEND_ONLY');
  });

  describe('constructor', () => {
    it('should initialize with default settings', () => {
      const defaultEnforcer = new BuildQualityEnforcer();
      expect(defaultEnforcer.getFolderStructure()).toBeDefined();
    });

    it('should accept strictness and appType', () => {
      const strictEnforcer = new BuildQualityEnforcer('strict', 'FULL_STACK');
      const structure = strictEnforcer.getFolderStructure();
      expect(structure.description).toContain('full-stack');
    });
  });

  describe('setAppType', () => {
    it('should change the folder structure', () => {
      enforcer.setAppType('DASHBOARD');
      const structure = enforcer.getFolderStructure();
      expect(structure.description).toContain('dashboard');
    });
  });

  describe('getFolderStructure', () => {
    it('should return correct structure for app type', () => {
      const structure = enforcer.getFolderStructure();
      expect(structure).toEqual(FOLDER_STRUCTURE_TEMPLATES.FRONTEND_ONLY);
    });
  });

  describe('runPreGenerationChecks', () => {
    it('should aggregate results from all checks', () => {
      const ctx = createMockPreGenContext({ phaseNumber: 1 });
      const result = enforcer.runPreGenerationChecks(ctx);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('requiredActions');
    });

    it('should deduplicate suggestions', () => {
      const ctx = createMockPreGenContext({ phaseNumber: 1 });
      const result = enforcer.runPreGenerationChecks(ctx);

      const uniqueSuggestions = [...new Set(result.suggestions)];
      expect(result.suggestions.length).toBe(uniqueSuggestions.length);
    });
  });

  describe('runPostGenerationValidations', () => {
    it('should run validations on files', () => {
      const files = [createMockFile('src/App.tsx', 'const App = () => <div>Hello</div>;')];
      const result = enforcer.runPostGenerationValidations(files);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('summary');
    });

    it('should skip info-level checks in relaxed mode', () => {
      const relaxedEnforcer = new BuildQualityEnforcer('relaxed', 'FRONTEND_ONLY');
      const files = [
        createMockFile(
          'src/App.tsx',
          `
async function fetchData() {
  await fetch('/api');
}
`
        ),
      ];
      const result = relaxedEnforcer.runPostGenerationValidations(files);

      // Relaxed mode should skip 'info' severity checks like error boundaries
      expect(result.issues.length).toBe(0);
    });
  });

  describe('recordPatternFeedback', () => {
    it('should record critical issues for prompt injection', () => {
      const report = createMockQualityReport();
      enforcer.recordPatternFeedback(report);

      const promptSection = enforcer.getPatternFeedbackForPrompt();
      expect(promptSection).toContain('AVOID');
      expect(promptSection).toContain('syntax_error');
    });

    it('should limit feedback to 10 patterns', () => {
      // Record 15 reports to test limit
      for (let i = 0; i < 15; i++) {
        enforcer.recordPatternFeedback(
          createMockQualityReport({
            issues: [
              {
                id: `issue-${i}`,
                category: 'syntax_error',
                severity: 'critical',
                file: 'test.tsx',
                message: `Error ${i}`,
                autoFixable: false,
              },
            ],
          })
        );
      }

      const feedback = enforcer.getPatternFeedbackForPrompt();
      const lines = feedback.split('\n').filter((l) => l.startsWith('- AVOID'));
      expect(lines.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getPatternFeedbackForPrompt', () => {
    it('should return empty string when no feedback recorded', () => {
      const feedback = enforcer.getPatternFeedbackForPrompt();
      expect(feedback).toBe('');
    });
  });

  describe('generateStructurePrompt', () => {
    it('should generate structure prompt section', () => {
      const prompt = enforcer.generateStructurePrompt();

      expect(prompt).toContain('FOLDER STRUCTURE REQUIREMENTS');
      expect(prompt).toContain('Required files');
      expect(prompt).toContain('Recommended structure');
      expect(prompt).toContain('Organization guidelines');
    });
  });

  describe('generateCodeOrganizationPrompt', () => {
    it('should generate code organization prompt section', () => {
      const prompt = enforcer.generateCodeOrganizationPrompt();

      expect(prompt).toContain('CODE ORGANIZATION BEST PRACTICES');
      expect(prompt).toContain('Component Structure');
      expect(prompt).toContain('API Route Structure');
      expect(prompt).toContain('Custom Hooks');
      expect(prompt).toContain('Type Definitions');
    });
  });

  describe('getQualityPromptSection', () => {
    it('should combine all prompt sections', () => {
      enforcer.recordPatternFeedback(createMockQualityReport());
      const prompt = enforcer.getQualityPromptSection();

      expect(prompt).toContain('AVOID');
      expect(prompt).toContain('FOLDER STRUCTURE');
      expect(prompt).toContain('CODE ORGANIZATION');
    });
  });

  describe('validatePlan', () => {
    it('should validate a build plan', () => {
      const mockPlan: DynamicPhasePlan = {
        id: 'test-plan',
        appName: 'Test App',
        appDescription: 'A test app',
        totalPhases: 3,
        phases: [
          {
            number: 1,
            name: 'Project Setup',
            description: 'Setup',
            domain: 'setup',
            features: [],
            featureDetails: [],
            estimatedTokens: 2000,
            estimatedTime: '2 min',
            dependencies: [],
            dependencyNames: [],
            testCriteria: [],
            status: 'pending',
          },
          {
            number: 2,
            name: 'Features',
            description: 'Build features',
            domain: 'feature',
            features: [],
            featureDetails: [],
            estimatedTokens: 3000,
            estimatedTime: '3 min',
            dependencies: [1],
            dependencyNames: ['Project Setup'],
            testCriteria: [],
            status: 'pending',
          },
          {
            number: 3,
            name: 'Polish',
            description: 'Polish',
            domain: 'polish',
            features: [],
            featureDetails: [],
            estimatedTokens: 2000,
            estimatedTime: '2 min',
            dependencies: [2],
            dependencyNames: ['Features'],
            testCriteria: [],
            status: 'pending',
          },
        ],
        estimatedTotalTime: '7 min',
        estimatedTotalTokens: 7000,
        complexity: 'simple',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        concept: {
          name: 'Test App',
          description: 'A test app',
          purpose: 'Testing',
          targetUsers: 'Developers',
          coreFeatures: [],
          uiPreferences: {
            style: 'modern',
            colorScheme: 'light',
            layout: 'single-page',
          },
          technical: {
            needsAuth: false,
            needsDatabase: false,
          },
        },
        currentPhaseNumber: 0,
        completedPhaseNumbers: [],
        failedPhaseNumbers: [],
        accumulatedFiles: [],
        accumulatedFeatures: [],
      };

      const result = enforcer.validatePlan(mockPlan);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about missing setup phase', () => {
      const mockPlan: DynamicPhasePlan = {
        id: 'test-plan',
        appName: 'Test App',
        appDescription: 'A test app',
        totalPhases: 1,
        phases: [
          {
            number: 1,
            name: 'Features',
            description: 'Build features',
            domain: 'feature',
            features: [],
            featureDetails: [],
            estimatedTokens: 3000,
            estimatedTime: '3 min',
            dependencies: [],
            dependencyNames: [],
            testCriteria: [],
            status: 'pending',
          },
        ],
        estimatedTotalTime: '3 min',
        estimatedTotalTokens: 3000,
        complexity: 'simple',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        concept: {
          name: 'Test App',
          description: 'A test app',
          purpose: 'Testing',
          targetUsers: 'Developers',
          coreFeatures: [],
          uiPreferences: {
            style: 'modern',
            colorScheme: 'light',
            layout: 'single-page',
          },
          technical: {
            needsAuth: false,
            needsDatabase: false,
          },
        },
        currentPhaseNumber: 0,
        completedPhaseNumbers: [],
        failedPhaseNumbers: [],
        accumulatedFiles: [],
        accumulatedFeatures: [],
      };

      const result = enforcer.validatePlan(mockPlan);
      expect(result.isValid).toBe(false);
      expect(result.warnings).toContainEqual(expect.stringContaining('setup'));
    });
  });

  describe('generatePhaseSummary', () => {
    it('should generate summary for a phase', () => {
      const phase = {
        number: 1,
        name: 'Project Setup',
        description: 'Setup',
        domain: 'setup' as const,
        features: [],
        featureDetails: [],
        estimatedTokens: 2000,
        estimatedTime: '2 min',
        dependencies: [],
        dependencyNames: [],
        testCriteria: [],
        status: 'completed' as const,
      };
      const files = [
        createMockFile('src/App.tsx', 'export default function App() {}'),
        createMockFile('src/index.css', '.root {}'),
      ];

      const summary = enforcer.generatePhaseSummary(phase, files);
      expect(summary).toContain('Phase 1');
      expect(summary).toContain('Project Setup');
      expect(summary).toContain('Files generated');
    });

    it('should include quality report in summary when available', () => {
      const phase = {
        number: 1,
        name: 'Project Setup',
        description: 'Setup',
        domain: 'setup' as const,
        features: [],
        featureDetails: [],
        estimatedTokens: 2000,
        estimatedTime: '2 min',
        dependencies: [],
        dependencyNames: [],
        testCriteria: [],
        status: 'completed' as const,
      };
      const files = [createMockFile('src/App.tsx', 'export default function App() {}')];
      const report = createMockQualityReport();

      const summary = enforcer.generatePhaseSummary(phase, files, report);
      expect(summary).toContain('Quality score');
      expect(summary).toContain('85');
    });
  });
});

// ============================================================================
// Convenience Functions Tests
// ============================================================================

describe('Convenience Functions', () => {
  describe('createQualityEnforcer', () => {
    it('should create an enforcer with defaults', () => {
      const enforcer = createQualityEnforcer();
      expect(enforcer).toBeInstanceOf(BuildQualityEnforcer);
    });

    it('should accept configuration', () => {
      const enforcer = createQualityEnforcer('strict', 'DASHBOARD');
      const structure = enforcer.getFolderStructure();
      expect(structure.description).toContain('dashboard');
    });
  });

  describe('getFolderStructureForAppType', () => {
    it('should return correct structure for each app type', () => {
      const frontendStructure = getFolderStructureForAppType('FRONTEND_ONLY');
      expect(frontendStructure.requiredFiles).toContain('src/App.tsx');

      const fullStackStructure = getFolderStructureForAppType('FULL_STACK');
      expect(fullStackStructure.requiredFiles).toContain('src/app/layout.tsx');

      const dashboardStructure = getFolderStructureForAppType('DASHBOARD');
      expect(dashboardStructure.structure).toContain('src/components/charts/');
    });
  });

  describe('getCodeOrganizationPatterns', () => {
    it('should return all patterns', () => {
      const patterns = getCodeOrganizationPatterns();
      expect(patterns.COMPONENT).toBeDefined();
      expect(patterns.API_ROUTE).toBeDefined();
      expect(patterns.HOOK).toBeDefined();
      expect(patterns.TYPES).toBeDefined();
    });
  });
});
