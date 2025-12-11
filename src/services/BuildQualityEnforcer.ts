/**
 * Build Quality Enforcer
 *
 * Enforces best practices and quality standards during app building.
 * Provides folder structure templates, code organization patterns,
 * and integrates with the quality review pipeline.
 *
 * This service bridges the gap between code generation and quality review
 * to ensure apps are built with optimal structure from the start.
 */

import type { ReviewFile, QualityReport, ReviewStrictness } from '@/types/codeReview';
import type { DynamicPhasePlan, DynamicPhase } from '@/types/dynamicPhases';

// ============================================================================
// FOLDER STRUCTURE PATTERNS
// ============================================================================

/**
 * Recommended folder structures for different app types
 */
export const FOLDER_STRUCTURE_TEMPLATES = {
  /**
   * Frontend-only React apps (single page apps, dashboards, games)
   */
  FRONTEND_ONLY: {
    description: 'Recommended structure for client-side only React apps',
    structure: [
      'src/App.tsx',
      'src/index.css',
      'src/components/',
      'src/components/ui/',
      'src/components/layout/',
      'src/hooks/',
      'src/types/',
      'src/utils/',
      'src/lib/',
      'src/assets/',
    ],
    requiredFiles: ['src/App.tsx', 'src/index.css'],
    guidelines: [
      'Group related components in feature folders',
      'Keep hooks in a dedicated hooks/ directory',
      'Define TypeScript interfaces in types/',
      'Extract reusable utilities to utils/',
      'Use lib/ for external service configurations',
    ],
  },

  /**
   * Full-stack Next.js apps with API routes and database
   */
  FULL_STACK: {
    description: 'Recommended structure for full-stack Next.js apps',
    structure: [
      'src/app/',
      'src/app/layout.tsx',
      'src/app/page.tsx',
      'src/app/api/',
      'src/app/globals.css',
      'src/components/',
      'src/components/ui/',
      'src/components/forms/',
      'src/hooks/',
      'src/types/',
      'src/lib/',
      'src/utils/',
      'src/services/',
      'prisma/',
    ],
    requiredFiles: ['src/app/layout.tsx', 'src/app/page.tsx', 'src/app/globals.css'],
    guidelines: [
      'Place API routes in app/api/ with route.ts files',
      'Create shared UI components in components/ui/',
      'Use components/forms/ for form-specific components',
      'Keep database operations in services/',
      'Define Prisma schema in prisma/',
      'Use lib/ for database client and auth setup',
    ],
  },

  /**
   * Dashboard-style applications
   */
  DASHBOARD: {
    description: 'Recommended structure for dashboard applications',
    structure: [
      'src/app/',
      'src/app/layout.tsx',
      'src/app/page.tsx',
      'src/app/(dashboard)/',
      'src/app/(dashboard)/layout.tsx',
      'src/app/api/',
      'src/components/',
      'src/components/dashboard/',
      'src/components/charts/',
      'src/components/tables/',
      'src/components/ui/',
      'src/hooks/',
      'src/types/',
      'src/lib/',
    ],
    requiredFiles: ['src/app/layout.tsx', 'src/app/page.tsx'],
    guidelines: [
      'Use route groups (parentheses) for dashboard layout',
      'Create dedicated chart components in components/charts/',
      'Keep table/data grid components in components/tables/',
      'Implement shared dashboard widgets in components/dashboard/',
    ],
  },
} as const;

export type AppStructureType = keyof typeof FOLDER_STRUCTURE_TEMPLATES;

// ============================================================================
// CODE ORGANIZATION PATTERNS
// ============================================================================

/**
 * Code organization patterns for generating well-structured code
 */
export const CODE_ORGANIZATION_PATTERNS = {
  /**
   * Component file structure pattern
   */
  COMPONENT: {
    imports: 'Group imports: React first, then libraries, then local imports, then types',
    types: 'Define component props interface directly above the component',
    hooks: 'Declare all hooks at the top of the component function',
    handlers: 'Define event handlers before the return statement',
    render: 'Keep JSX clean - extract complex logic to variables or functions above',
    exports: 'Use default export for the main component, named exports for utilities',
  },

  /**
   * API route structure pattern
   */
  API_ROUTE: {
    imports: 'Import types and utilities at the top',
    validation: 'Validate request body early with clear error messages',
    auth: 'Check authentication/authorization before processing',
    logic: 'Extract business logic to separate service functions',
    response: 'Always return consistent response shape with success/error',
    errorHandling: 'Wrap in try-catch with proper error logging and user-friendly messages',
  },

  /**
   * Custom hook structure pattern
   */
  HOOK: {
    naming: 'Start with "use" prefix (e.g., useAuth, useData)',
    params: 'Accept configuration object for flexibility',
    state: 'Initialize all state at the top',
    effects: 'Group related effects together with clear dependencies',
    return: 'Return object with named properties for clarity',
    cleanup: 'Always handle cleanup in useEffect return',
  },

  /**
   * Type definition pattern
   */
  TYPES: {
    naming: 'Use PascalCase for types/interfaces',
    exports: 'Export all types - make them available for consumers',
    docs: 'Add JSDoc comments for complex types',
    composition: 'Prefer interface extension over intersection types when possible',
    enums: 'Use const assertions or string unions over enums for better tree-shaking',
  },
} as const;

// ============================================================================
// PRE-GENERATION CHECKS
// ============================================================================

/**
 * Checks to run before generating code for a phase
 */
export interface PreGenerationCheck {
  name: string;
  description: string;
  check: (context: PreGenerationContext) => PreGenerationResult;
}

export interface PreGenerationContext {
  phaseNumber: number;
  phaseName: string;
  features: string[];
  existingFiles: string[];
  appType: 'FRONTEND_ONLY' | 'FULL_STACK' | 'DASHBOARD';
  layoutDesign?: boolean;
}

export interface PreGenerationResult {
  passed: boolean;
  warnings: string[];
  suggestions: string[];
  requiredActions: string[];
}

/**
 * Pre-generation checks to ensure optimal code generation
 */
export const PRE_GENERATION_CHECKS: PreGenerationCheck[] = [
  {
    name: 'Structure Setup',
    description: 'Verify base folder structure exists',
    check: (ctx) => {
      const template = FOLDER_STRUCTURE_TEMPLATES[ctx.appType];
      const missingRequired = template.requiredFiles.filter(
        (f) => !ctx.existingFiles.some((ef) => ef.includes(f.replace('src/', '')))
      );

      return {
        passed: ctx.phaseNumber === 1 || missingRequired.length === 0,
        warnings:
          missingRequired.length > 0 && ctx.phaseNumber > 1
            ? [`Missing required files from phase 1: ${missingRequired.join(', ')}`]
            : [],
        suggestions: [...template.guidelines],
        requiredActions:
          ctx.phaseNumber === 1
            ? [`Create base structure: ${template.requiredFiles.join(', ')}`]
            : [],
      };
    },
  },
  {
    name: 'Design System',
    description: 'Check if design system is properly configured',
    check: (ctx) => {
      const hasDesign = ctx.layoutDesign;
      const hasGlobalsCss = ctx.existingFiles.some(
        (f) => f.includes('globals.css') || f.includes('index.css')
      );

      return {
        passed: !hasDesign || hasGlobalsCss,
        warnings: hasDesign && !hasGlobalsCss ? ['Design system specified but no CSS file found'] : [],
        suggestions: hasDesign
          ? [
              'Use CSS variables (var(--color-primary)) instead of hardcoded colors',
              'Apply design tokens consistently across all components',
            ]
          : [],
        requiredActions: [],
      };
    },
  },
  {
    name: 'Type Safety',
    description: 'Ensure types are defined before component implementation',
    check: (ctx) => {
      const hasTypes = ctx.existingFiles.some((f) => f.includes('/types/'));
      const isLaterPhase = ctx.phaseNumber > 2;

      return {
        passed: !isLaterPhase || hasTypes,
        warnings: isLaterPhase && !hasTypes ? ['No types directory found - define TypeScript interfaces'] : [],
        suggestions: [
          'Define shared types in src/types/',
          'Create interface for each entity (User, Product, etc.)',
          'Export types for use across components',
        ],
        requiredActions: [],
      };
    },
  },
];

// ============================================================================
// POST-GENERATION VALIDATION
// ============================================================================

/**
 * Post-generation validation rules
 */
export interface PostGenerationValidation {
  name: string;
  severity: 'error' | 'warning' | 'info';
  check: (files: ReviewFile[]) => PostValidationResult;
}

export interface PostValidationResult {
  passed: boolean;
  issues: Array<{
    file: string;
    message: string;
    suggestion: string;
    line?: number;
  }>;
}

/**
 * Post-generation validations to catch common issues
 */
export const POST_GENERATION_VALIDATIONS: PostGenerationValidation[] = [
  {
    name: 'Consistent Imports',
    severity: 'warning',
    check: (files) => {
      const issues: PostValidationResult['issues'] = [];

      for (const file of files) {
        // Check for mixed import styles
        const hasRelativeImports = /@\//.test(file.content);
        const hasDotImports = /from ['"]\.\.?\//.test(file.content);

        if (hasRelativeImports && hasDotImports) {
          issues.push({
            file: file.path,
            message: 'Mixed import styles (@ alias and relative paths)',
            suggestion: 'Use consistent import style - prefer @ alias for better maintainability',
          });
        }
      }

      return { passed: issues.length === 0, issues };
    },
  },
  {
    name: 'Missing Error Boundaries',
    severity: 'info',
    check: (files) => {
      const issues: PostValidationResult['issues'] = [];
      const hasAsyncComponents = files.some((f) => /async\s+function|await\s+/.test(f.content));
      const hasErrorBoundary = files.some((f) => /ErrorBoundary|error\.tsx/.test(f.path));

      if (hasAsyncComponents && !hasErrorBoundary) {
        issues.push({
          file: 'project',
          message: 'Async operations without error boundary',
          suggestion: 'Add error.tsx for graceful error handling in Next.js app',
        });
      }

      return { passed: issues.length === 0, issues };
    },
  },
  {
    name: 'Loading States',
    severity: 'info',
    check: (files) => {
      const issues: PostValidationResult['issues'] = [];
      const hasAsyncDataFetching = files.some((f) =>
        /fetch\(|useSWR|useQuery|getServerSide|getStaticProps/.test(f.content)
      );
      const hasLoadingState = files.some(
        (f) =>
          /loading\.tsx|isLoading|skeleton|Spinner|LoadingSpinner/.test(f.content) ||
          f.path.includes('loading.')
      );

      if (hasAsyncDataFetching && !hasLoadingState) {
        issues.push({
          file: 'project',
          message: 'Data fetching without loading states',
          suggestion: 'Add loading.tsx or implement loading skeletons for better UX',
        });
      }

      return { passed: issues.length === 0, issues };
    },
  },
  {
    name: 'Component Consistency',
    severity: 'warning',
    check: (files) => {
      const issues: PostValidationResult['issues'] = [];

      for (const file of files) {
        if (!file.path.endsWith('.tsx') && !file.path.endsWith('.jsx')) continue;

        // Check for components without proper typing
        const hasPropsInterface = /interface\s+\w*Props\b/.test(file.content);
        const hasPropsUsage = /\(\s*\{\s*\w+/.test(file.content);

        if (hasPropsUsage && !hasPropsInterface && !file.path.includes('/ui/')) {
          issues.push({
            file: file.path,
            message: 'Component with props but no Props interface defined',
            suggestion: 'Define a Props interface for type safety and documentation',
          });
        }
      }

      return { passed: issues.length === 0, issues };
    },
  },
  {
    name: 'Hardcoded Values',
    severity: 'warning',
    check: (files) => {
      const issues: PostValidationResult['issues'] = [];

      for (const file of files) {
        if (!file.path.endsWith('.tsx') && !file.path.endsWith('.jsx')) continue;

        // Check for hardcoded API URLs
        const lines = file.content.split('\n');
        lines.forEach((line, index) => {
          if (/https?:\/\/[a-zA-Z0-9]/.test(line) && !/localhost|127\.0\.0\.1/.test(line)) {
            issues.push({
              file: file.path,
              line: index + 1,
              message: 'Hardcoded API URL',
              suggestion: 'Use environment variables for API URLs',
            });
          }
        });
      }

      return { passed: issues.length === 0, issues };
    },
  },
];

// ============================================================================
// BUILD QUALITY ENFORCER CLASS
// ============================================================================

export class BuildQualityEnforcer {
  private strictness: ReviewStrictness;
  private appType: AppStructureType;
  private patternFeedback: string[];

  constructor(strictness: ReviewStrictness = 'standard', appType: AppStructureType = 'FRONTEND_ONLY') {
    this.strictness = strictness;
    this.appType = appType;
    this.patternFeedback = [];
  }

  /**
   * Set the app type for structure recommendations
   */
  setAppType(appType: AppStructureType): void {
    this.appType = appType;
  }

  /**
   * Get folder structure template for current app type
   */
  getFolderStructure(): (typeof FOLDER_STRUCTURE_TEMPLATES)[AppStructureType] {
    return FOLDER_STRUCTURE_TEMPLATES[this.appType];
  }

  /**
   * Run pre-generation checks
   */
  runPreGenerationChecks(context: PreGenerationContext): PreGenerationResult {
    const allWarnings: string[] = [];
    const allSuggestions: string[] = [];
    const allRequiredActions: string[] = [];
    let allPassed = true;

    for (const check of PRE_GENERATION_CHECKS) {
      const result = check.check(context);
      if (!result.passed) allPassed = false;
      allWarnings.push(...result.warnings);
      allSuggestions.push(...result.suggestions);
      allRequiredActions.push(...result.requiredActions);
    }

    return {
      passed: allPassed,
      warnings: [...new Set(allWarnings)],
      suggestions: [...new Set(allSuggestions)],
      requiredActions: [...new Set(allRequiredActions)],
    };
  }

  /**
   * Run post-generation validations
   */
  runPostGenerationValidations(files: ReviewFile[]): {
    passed: boolean;
    issues: PostValidationResult['issues'];
    summary: string;
  } {
    const allIssues: PostValidationResult['issues'] = [];
    let passed = true;

    for (const validation of POST_GENERATION_VALIDATIONS) {
      // Skip info-level checks in relaxed mode
      if (this.strictness === 'relaxed' && validation.severity === 'info') continue;
      // Skip warning-level checks in relaxed mode
      if (this.strictness === 'relaxed' && validation.severity === 'warning') continue;

      const result = validation.check(files);
      if (!result.passed) {
        if (validation.severity === 'error') passed = false;
        allIssues.push(...result.issues);
      }
    }

    const summary =
      allIssues.length === 0
        ? 'All post-generation validations passed'
        : `Found ${allIssues.length} issue(s) during post-generation validation`;

    return { passed, issues: allIssues, summary };
  }

  /**
   * Record pattern feedback from quality issues
   * This helps prevent recurring issues in future generations
   */
  recordPatternFeedback(report: QualityReport): void {
    // Track common issues to inject into future prompts
    const criticalIssues = report.issues.filter((i) => i.severity === 'critical' || i.severity === 'high');

    for (const issue of criticalIssues) {
      const feedback = `AVOID: ${issue.category} - ${issue.message}`;
      if (!this.patternFeedback.includes(feedback)) {
        this.patternFeedback.push(feedback);
      }
    }

    // Limit feedback to most recent 10 patterns
    if (this.patternFeedback.length > 10) {
      this.patternFeedback = this.patternFeedback.slice(-10);
    }
  }

  /**
   * Get pattern feedback for prompt injection
   */
  getPatternFeedbackForPrompt(): string {
    if (this.patternFeedback.length === 0) return '';

    return `
## LEARN FROM PREVIOUS ISSUES

The following issues were detected in previous generations. AVOID these patterns:

${this.patternFeedback.map((f) => `- ${f}`).join('\n')}
`.trim();
  }

  /**
   * Generate structure validation prompt section
   */
  generateStructurePrompt(): string {
    const structure = this.getFolderStructure();

    return `
## FOLDER STRUCTURE REQUIREMENTS

${structure.description}

**Required files:**
${structure.requiredFiles.map((f) => `- ${f}`).join('\n')}

**Recommended structure:**
${structure.structure.map((f) => `- ${f}`).join('\n')}

**Organization guidelines:**
${structure.guidelines.map((g) => `- ${g}`).join('\n')}
`.trim();
  }

  /**
   * Generate code organization prompt section
   */
  generateCodeOrganizationPrompt(): string {
    return `
## CODE ORGANIZATION BEST PRACTICES

**Component Structure:**
${Object.entries(CODE_ORGANIZATION_PATTERNS.COMPONENT)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

**API Route Structure:**
${Object.entries(CODE_ORGANIZATION_PATTERNS.API_ROUTE)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

**Custom Hooks:**
${Object.entries(CODE_ORGANIZATION_PATTERNS.HOOK)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

**Type Definitions:**
${Object.entries(CODE_ORGANIZATION_PATTERNS.TYPES)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}
`.trim();
  }

  /**
   * Get complete quality enforcement prompt section
   */
  getQualityPromptSection(): string {
    const patternFeedback = this.getPatternFeedbackForPrompt();
    const structurePrompt = this.generateStructurePrompt();
    const codeOrgPrompt = this.generateCodeOrganizationPrompt();

    return `
${patternFeedback}

${structurePrompt}

${codeOrgPrompt}
`.trim();
  }

  /**
   * Validate a complete build plan
   */
  validatePlan(plan: DynamicPhasePlan): {
    isValid: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check for setup phase
    const hasSetupPhase = plan.phases.some(
      (p) => p.domain === 'setup' || p.name.toLowerCase().includes('setup')
    );
    if (!hasSetupPhase) {
      warnings.push('No setup phase detected - ensure project structure is created first');
    }

    // Check for polish phase
    const hasPolishPhase = plan.phases.some(
      (p) => p.domain === 'polish' || p.name.toLowerCase().includes('polish')
    );
    if (!hasPolishPhase && plan.phases.length > 3) {
      recommendations.push('Consider adding a polish phase for loading states, error handling, and UX refinements');
    }

    // Check phase dependencies
    for (const phase of plan.phases) {
      if (phase.domain === 'auth' && !plan.phases.some((p) => p.domain === 'database' && p.number < phase.number)) {
        if (plan.concept.technical.needsDatabase) {
          warnings.push(`Auth phase ${phase.number} may need database to be set up first`);
        }
      }
    }

    // Check for reasonable token estimates
    const highTokenPhases = plan.phases.filter((p) => p.estimatedTokens > 8000);
    if (highTokenPhases.length > 0) {
      recommendations.push(
        `${highTokenPhases.length} phase(s) have high token estimates - consider splitting for better results`
      );
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      recommendations,
    };
  }

  /**
   * Generate a quality summary for a completed phase
   */
  generatePhaseSummary(
    phase: DynamicPhase,
    files: ReviewFile[],
    report?: QualityReport
  ): string {
    const fileCount = files.length;
    const codeFiles = files.filter((f) => /\.(tsx?|jsx?)$/.test(f.path)).length;
    const typeFiles = files.filter((f) => f.path.includes('/types/')).length;

    let summary = `## Phase ${phase.number}: ${phase.name} - Summary\n\n`;
    summary += `**Files generated:** ${fileCount} (${codeFiles} code files, ${typeFiles} type files)\n`;

    if (report) {
      summary += `**Quality score:** ${report.overallScore}/100\n`;
      summary += `**Issues found:** ${report.totalIssues} (${report.fixedIssues} auto-fixed)\n`;

      if (report.issuesBySeverity.critical > 0) {
        summary += `⚠️ **Critical issues:** ${report.issuesBySeverity.critical}\n`;
      }
    }

    const postValidation = this.runPostGenerationValidations(files);
    if (postValidation.issues.length > 0) {
      summary += `\n**Structure recommendations:**\n`;
      postValidation.issues.slice(0, 3).forEach((issue) => {
        summary += `- ${issue.message}: ${issue.suggestion}\n`;
      });
    }

    return summary;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create a BuildQualityEnforcer with default settings
 */
export function createQualityEnforcer(
  strictness?: ReviewStrictness,
  appType?: AppStructureType
): BuildQualityEnforcer {
  return new BuildQualityEnforcer(strictness, appType);
}

/**
 * Get folder structure for a given app type
 */
export function getFolderStructureForAppType(
  appType: AppStructureType
): (typeof FOLDER_STRUCTURE_TEMPLATES)[AppStructureType] {
  return FOLDER_STRUCTURE_TEMPLATES[appType];
}

/**
 * Get code organization patterns
 */
export function getCodeOrganizationPatterns(): typeof CODE_ORGANIZATION_PATTERNS {
  return CODE_ORGANIZATION_PATTERNS;
}

export default BuildQualityEnforcer;
