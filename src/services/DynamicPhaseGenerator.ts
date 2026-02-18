/**
 * Dynamic Phase Generator Service
 *
 * Analyzes an AppConcept and generates an optimal number of phases (3-25+)
 * based on feature count, complexity, dependencies, and context limits.
 *
 * Replaces the fixed 5-phase system with intelligent, adaptive phase planning.
 *
 * This is the orchestrator — classification, phase creation, context extraction,
 * and file analysis are delegated to focused sub-modules in ./phaseGeneration/.
 */

import type { AppConcept, Feature } from '@/types/appConcept';
import type {
  FeatureDomain,
  FeatureClassification,
  DynamicPhase,
  DynamicPhasePlan,
  PhasePlanGenerationResult,
  PhaseGeneratorConfig,
  FeaturesByDomain,
} from '@/types/dynamicPhases';
import type { ArchitectureSpec } from '@/types/architectureSpec';

import { DEFAULT_PHASE_GENERATOR_CONFIG as defaultConfig } from '@/types/dynamicPhases';

// Sub-module imports
import {
  classifyFeatures,
  getImplicitFeatures,
  extractFeaturesFromLayout,
  inferStateComplexity,
  detectMemoryNeeds,
} from './phaseGeneration/featureClassifier';

import {
  createSetupPhase,
  createLayoutInjectionPhase,
  createPolishPhase,
  createPhaseFromFeatures,
  splitFeaturesIntoPhases,
} from './phaseGeneration/phaseFactory';

import { enhancePhaseWithContext } from './phaseGeneration/contextExtractor';
import { analyzeGeneratedFiles } from './phaseGeneration/fileAnalyzer';

// Re-export sub-module functions that were previously class methods
// so consumers using static-like access patterns still work
export { inferStateComplexity, detectMemoryNeeds } from './phaseGeneration/featureClassifier';

// ============================================================================
// MAIN GENERATOR CLASS
// ============================================================================

export class DynamicPhaseGenerator {
  private config: PhaseGeneratorConfig;

  constructor(config: Partial<PhaseGeneratorConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  // Static method wrappers — used by generate-phases/route.ts as DynamicPhaseGenerator.detectMemoryNeeds()
  static inferStateComplexity = inferStateComplexity;
  static detectMemoryNeeds = detectMemoryNeeds;

  /**
   * Generate a complete phase plan from an AppConcept
   */
  generatePhasePlan(concept: AppConcept): PhasePlanGenerationResult {
    const warnings: string[] = [];

    try {
      // Step 1: Classify all features
      const classifications = classifyFeatures(concept.coreFeatures, this.config);

      // Step 2: Add implicit features from technical requirements
      const implicitFeatures = getImplicitFeatures(concept.technical);
      const allClassifications = [...classifications, ...implicitFeatures];

      // Step 2.5: Add features from layoutManifest if present
      if (concept.layoutManifest) {
        allClassifications.push(...extractFeaturesFromLayout(concept.layoutManifest));
      }

      // Step 3: Group features by domain
      const featuresByDomain = this.groupByDomain(allClassifications);

      // Step 4: Generate phases from grouped features
      const phases = this.generatePhasesFromGroups(featuresByDomain, concept);

      // Step 5: Calculate dependencies between phases
      this.calculatePhaseDependencies(phases);

      // Step 6: Validate and adjust the plan
      const validation = this.validatePhasePlan(phases);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join('; '),
          warnings: validation.warnings,
          analysisDetails: this.getAnalysisDetails(allClassifications, featuresByDomain),
        };
      }
      warnings.push(...validation.warnings);

      // Step 7: Create the final plan
      const plan = this.createPhasePlan(phases, concept);

      return {
        success: true,
        plan,
        warnings,
        analysisDetails: this.getAnalysisDetails(allClassifications, featuresByDomain),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during phase generation',
        warnings,
        analysisDetails: {
          totalFeatures: concept.coreFeatures.length,
          complexFeatures: 0,
          domainBreakdown: {} as Record<FeatureDomain, number>,
          estimatedContextPerPhase: 0,
        },
      };
    }
  }

  /**
   * Generate a phase plan with backend architecture context
   * Injects backend phases from ArchitectureSpec at appropriate positions
   */
  generatePhasePlanWithArchitecture(
    concept: AppConcept,
    architectureSpec: ArchitectureSpec
  ): PhasePlanGenerationResult {
    // First, generate the base plan
    const result = this.generatePhasePlan(concept);

    if (!result.success || !result.plan) {
      return result;
    }

    // Inject backend phases from architecture spec
    const enhancedPlan = this.injectBackendPhases(result.plan, architectureSpec);

    // Attach the architecture spec to the plan for reference during code generation
    enhancedPlan.architectureSpec = architectureSpec;

    return {
      ...result,
      plan: enhancedPlan,
    };
  }

  // ============================================================================
  // BACKEND PHASE INJECTION
  // ============================================================================

  /**
   * Inject backend phases from ArchitectureSpec into the plan
   * Backend phases are inserted after setup but before feature phases
   */
  private injectBackendPhases(plan: DynamicPhasePlan, spec: ArchitectureSpec): DynamicPhasePlan {
    const backendPhases = spec.backendPhases;

    if (!backendPhases || backendPhases.length === 0) {
      return plan;
    }

    const existingPhases = [...plan.phases];

    // Sort backend phases by priority (lower = earlier)
    const sortedBackendPhases = [...backendPhases].sort((a, b) => a.priority - b.priority);

    // Find insertion point: after setup phase but before feature phases
    const setupPhaseIndex = existingPhases.findIndex((p) => p.domain === 'setup');
    const insertAfter = setupPhaseIndex >= 0 ? setupPhaseIndex : 0;

    // Convert BackendPhaseSpec to DynamicPhase
    const convertedPhases: DynamicPhase[] = sortedBackendPhases.map((bp, idx) => {
      // Find API routes relevant to this phase's features
      const relevantRoutes = spec.api.routes.filter((r) =>
        bp.features.some((f) => r.feature.toLowerCase().includes(f.toLowerCase()))
      );

      return {
        number: insertAfter + idx + 2, // +2 to account for setup being 1
        name: bp.name,
        description: bp.description,
        domain: bp.domain,
        features: bp.features,
        featureDetails: [],
        estimatedTokens: bp.estimatedTokens,
        estimatedTime: `${Math.ceil(bp.estimatedTokens / 1500)}-${Math.ceil(bp.estimatedTokens / 1500) + 2} min`,
        dependencies: this.resolveBackendDependencies(bp.dependencies, existingPhases, insertAfter),
        dependencyNames: bp.dependencies,
        testCriteria: bp.testCriteria,
        status: 'pending' as const,
        // Attach architecture context for code generation
        architectureContext: {
          files: bp.files,
          prismaSchema: bp.domain === 'database' ? spec.database.prismaSchema : undefined,
          apiRoutes: relevantRoutes,
        },
      };
    });

    // Insert backend phases and renumber all subsequent phases
    const newPhases = [
      ...existingPhases.slice(0, insertAfter + 1),
      ...convertedPhases,
      ...existingPhases.slice(insertAfter + 1).map((p) => ({
        ...p,
        number: p.number + convertedPhases.length,
        // Update dependencies to account for new phase numbers
        dependencies: p.dependencies.map((depNum) =>
          depNum > insertAfter ? depNum + convertedPhases.length : depNum
        ),
      })),
    ];

    const updatedTotalTokens =
      plan.estimatedTotalTokens +
      sortedBackendPhases.reduce((sum, p) => sum + p.estimatedTokens, 0);
    const totalMinutes = Math.ceil(updatedTotalTokens / 1500);

    return {
      ...plan,
      phases: newPhases,
      totalPhases: newPhases.length,
      estimatedTotalTokens: updatedTotalTokens,
      estimatedTotalTime: `${totalMinutes}-${totalMinutes + newPhases.length * 2} min`,
    };
  }

  /**
   * Resolve backend phase dependencies to phase numbers
   */
  private resolveBackendDependencies(
    dependencies: string[],
    existingPhases: DynamicPhase[],
    insertAfter: number
  ): number[] {
    const resolved: number[] = [];
    const missing: string[] = [];

    for (const depName of dependencies) {
      const found = existingPhases.find((p) => p.name.toLowerCase() === depName.toLowerCase());
      if (found) {
        if (found.number <= insertAfter + 1) {
          resolved.push(found.number);
        } else {
          // Dependency exists but runs AFTER current phase - this is a scheduling error
          console.warn(
            `Dependency ${depName} (phase ${found.number}) scheduled after current phase (inserting at ${insertAfter + 1})`
          );
        }
      } else {
        missing.push(depName);
      }
    }

    if (missing.length > 0) {
      console.warn(`Missing backend dependencies: ${missing.join(', ')}`);
    }

    return resolved;
  }

  // ============================================================================
  // DOMAIN GROUPING
  // ============================================================================

  /**
   * Group features by their domain
   */
  private groupByDomain(classifications: FeatureClassification[]): FeaturesByDomain {
    const groups = new Map<FeatureDomain, FeatureClassification[]>();

    for (const classification of classifications) {
      // Features requiring their own phase get isolated
      if (classification.requiresOwnPhase) {
        const isolatedDomain = classification.domain;
        if (!groups.has(isolatedDomain)) {
          groups.set(isolatedDomain, []);
        }

        // Check if this specific feature type already exists
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const existing = groups.get(isolatedDomain)!;
        const alreadyExists = existing.some(
          (c) => c.suggestedPhaseName === classification.suggestedPhaseName
        );

        if (!alreadyExists) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          groups.get(isolatedDomain)!.push(classification);
        }
      } else {
        // Group by domain
        if (!groups.has(classification.domain)) {
          groups.set(classification.domain, []);
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        groups.get(classification.domain)!.push(classification);
      }
    }

    return groups;
  }

  // ============================================================================
  // PHASE GENERATION (ORCHESTRATION)
  // ============================================================================

  /**
   * Generate phases from grouped features
   */
  private generatePhasesFromGroups(
    featuresByDomain: FeaturesByDomain,
    concept: AppConcept
  ): DynamicPhase[] {
    const phases: DynamicPhase[] = [];
    let phaseNumber = 1;

    // Phase 1: Layout Injection (replaces Setup + Design System) when layout exists,
    // otherwise standard Setup phase
    if (concept.layoutManifest) {
      phases.push(createLayoutInjectionPhase(phaseNumber++, concept));
    } else {
      phases.push(createSetupPhase(phaseNumber++, concept, this.config));
    }

    // Phase 2/3: Database (if needed) - always comes early
    if (featuresByDomain.has('database')) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const dbFeatures = featuresByDomain.get('database')!;
      // Include data model details in database phase
      const dataModelContext = concept.technical.dataModels
        ? `. Data models: ${concept.technical.dataModels.map((m) => m.name).join(', ')}`
        : '';
      phases.push(
        createPhaseFromFeatures(
          phaseNumber++,
          'Database Schema',
          `Set up database tables, types, and configuration${dataModelContext}`,
          'database',
          dbFeatures,
          concept
        )
      );
      featuresByDomain.delete('database');
    }

    // Phase 3: Authentication (if needed) - comes after database
    if (featuresByDomain.has('auth')) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const authFeatures = featuresByDomain.get('auth')!;
      // Include role context in auth phase (with capabilities for RBAC)
      const roleContext =
        concept.roles && concept.roles.length > 0
          ? `. User roles: ${concept.roles
              .map((r) => {
                const caps =
                  r.capabilities && r.capabilities.length > 0
                    ? ` (${r.capabilities.slice(0, 3).join(', ')}${r.capabilities.length > 3 ? '...' : ''})`
                    : '';
                return `${r.name}${caps}`;
              })
              .join(', ')}`
          : '';
      phases.push(
        createPhaseFromFeatures(
          phaseNumber++,
          'Authentication System',
          `Implement ${concept.technical.authType || 'email'} authentication${roleContext}`,
          'auth',
          authFeatures,
          concept
        )
      );
      featuresByDomain.delete('auth');
    }

    // Process remaining domains in priority order
    const domainPriority: FeatureDomain[] = [
      'core-entity',
      'feature',
      'ui-component',
      'integration',
      'storage',
      'real-time',
      'notification',
      'search',
      'analytics',
      'admin',
      'ui-role',
      'i18n',
      'testing',
      'backend-validator',
      'devops',
      'monitoring',
      'offline',
    ];

    for (const domain of domainPriority) {
      if (!featuresByDomain.has(domain)) continue;

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const features = featuresByDomain.get(domain)!;

      // Split large feature groups into multiple phases
      const subPhases = splitFeaturesIntoPhases(features, domain, this.config);

      for (const subPhase of subPhases) {
        phases.push(
          createPhaseFromFeatures(
            phaseNumber++,
            subPhase.name,
            subPhase.description,
            domain,
            subPhase.features,
            concept // Pass concept for rich context
          )
        );
      }
    }

    // Final Phase: ALWAYS end with Polish
    phases.push(createPolishPhase(phaseNumber, concept, this.config));

    return phases;
  }

  // ============================================================================
  // DEPENDENCY CALCULATION
  // ============================================================================

  /**
   * Calculate dependencies between phases
   */
  private calculatePhaseDependencies(phases: DynamicPhase[]): void {
    // Build a map of phase names to numbers
    const phaseByName = new Map<string, number>();
    for (const phase of phases) {
      phaseByName.set(phase.name, phase.number);
      // Also map by domain for implicit dependencies
      phaseByName.set(phase.domain, phase.number);
    }

    for (const phase of phases) {
      const deps = new Set<number>();
      const depNames = new Set<string>();

      // Phase 1 (setup) has no dependencies
      if (phase.number === 1) continue;

      // All phases depend on setup
      deps.add(1);
      depNames.add('Project Setup');

      // Check feature dependencies
      for (const feature of phase.featureDetails) {
        for (const depName of feature.dependencies) {
          const depPhaseNum = phaseByName.get(depName);
          if (depPhaseNum && depPhaseNum < phase.number) {
            deps.add(depPhaseNum);
            depNames.add(depName);
          }
        }
      }

      // Domain-based implicit dependencies
      if (phase.domain !== 'setup' && phase.domain !== 'database') {
        // Most features depend on database if it exists
        const dbPhase = phases.find((p) => p.domain === 'database');
        if (dbPhase && dbPhase.number < phase.number) {
          deps.add(dbPhase.number);
          depNames.add('Database Schema');
        }
      }

      // Auth-dependent domains
      const authDependentDomains: FeatureDomain[] = ['admin', 'ui-role', 'analytics'];
      if (authDependentDomains.includes(phase.domain)) {
        const authPhase = phases.find((p) => p.domain === 'auth');
        if (authPhase && authPhase.number < phase.number) {
          deps.add(authPhase.number);
          depNames.add('Authentication System');
        }
      }

      phase.dependencies = Array.from(deps).sort((a, b) => a - b);
      phase.dependencyNames = Array.from(depNames);
    }
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  /**
   * Validate the generated phase plan
   */
  private validatePhasePlan(phases: DynamicPhase[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check phase count
    if (phases.length < this.config.minPhases) {
      errors.push(`Too few phases: ${phases.length} (minimum: ${this.config.minPhases})`);
    }
    if (phases.length > this.config.maxPhases) {
      warnings.push(
        `High phase count: ${phases.length} (recommended max: ${this.config.maxPhases})`
      );
    }

    // Check for circular dependencies
    const visited = new Set<number>();
    const recursionStack = new Set<number>();

    const hasCycle = (phaseNum: number): boolean => {
      visited.add(phaseNum);
      recursionStack.add(phaseNum);

      const phase = phases.find((p) => p.number === phaseNum);
      if (phase) {
        for (const dep of phase.dependencies) {
          if (!visited.has(dep)) {
            if (hasCycle(dep)) return true;
          } else if (recursionStack.has(dep)) {
            return true;
          }
        }
      }

      recursionStack.delete(phaseNum);
      return false;
    };

    for (const phase of phases) {
      if (!visited.has(phase.number) && hasCycle(phase.number)) {
        errors.push(`Circular dependency detected involving phase ${phase.number}`);
      }
    }

    // Check token estimates
    for (const phase of phases) {
      if (phase.estimatedTokens > this.config.maxTokensPerPhase * 1.5) {
        warnings.push(
          `Phase ${phase.number} (${phase.name}) may exceed context limits: ${phase.estimatedTokens} tokens`
        );
      }
    }

    // Check for orphan features
    const allFeatures = phases.flatMap((p) => p.features);
    if (allFeatures.length === 0) {
      warnings.push('No features were included in the phase plan');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // PLAN CREATION
  // ============================================================================

  /**
   * Create the final phase plan object
   */
  private createPhasePlan(phases: DynamicPhase[], concept: AppConcept): DynamicPhasePlan {
    // Enhance all phases with rich context from the concept
    const enhancedPhases = phases.map((phase) => enhancePhaseWithContext(phase, concept));

    const totalTokens = enhancedPhases.reduce((sum, p) => sum + p.estimatedTokens, 0);
    const totalMinutes = enhancedPhases.reduce((sum, p) => {
      const match = p.estimatedTime.match(/(\d+)/);
      return sum + (match ? parseInt(match[1]) : 3);
    }, 0);

    // Determine overall complexity
    let complexity: DynamicPhasePlan['complexity'];
    if (enhancedPhases.length <= 3) {
      complexity = 'simple';
    } else if (enhancedPhases.length <= 6) {
      complexity = 'moderate';
    } else if (enhancedPhases.length <= 12) {
      complexity = 'complex';
    } else {
      complexity = 'enterprise';
    }

    return {
      id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      appName: concept.name,
      appDescription: concept.description,
      totalPhases: enhancedPhases.length,
      phases: enhancedPhases,
      estimatedTotalTime: `${totalMinutes}-${totalMinutes + enhancedPhases.length * 2} min`,
      estimatedTotalTokens: totalTokens,
      complexity,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      concept,
      currentPhaseNumber: 0,
      completedPhaseNumbers: [],
      failedPhaseNumbers: [],
      accumulatedFiles: [],
      accumulatedFeatures: [],
    };
  }

  /**
   * Get analysis details for debugging/reporting
   */
  private getAnalysisDetails(
    classifications: FeatureClassification[],
    featuresByDomain: FeaturesByDomain
  ) {
    const domainBreakdown: Record<string, number> = {};
    for (const [domain, features] of featuresByDomain) {
      domainBreakdown[domain] = features.length;
    }

    const complexFeatures = classifications.filter((c) => c.complexity === 'complex').length;
    const totalTokens = classifications.reduce((sum, c) => sum + c.estimatedTokens, 0);
    const avgTokensPerPhase = totalTokens / Math.max(1, featuresByDomain.size + 2); // +2 for setup and polish

    return {
      totalFeatures: classifications.length,
      complexFeatures,
      domainBreakdown: domainBreakdown as Record<FeatureDomain, number>,
      estimatedContextPerPhase: Math.round(avgTokensPerPhase),
    };
  }

  // ============================================================================
  // FILE ANALYSIS (delegated to sub-module)
  // ============================================================================

  /**
   * Analyze generated files — delegates to fileAnalyzer module
   * Preserved as instance method for backward compatibility with PhaseExecutionManager
   */
  analyzeGeneratedFiles(files: Array<{ path: string; content: string }>) {
    return analyzeGeneratedFiles(files);
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Generate a phase plan using default configuration
 */
export function generatePhasePlan(concept: AppConcept): PhasePlanGenerationResult {
  const generator = new DynamicPhaseGenerator();
  return generator.generatePhasePlan(concept);
}

/**
 * Generate a phase plan with custom configuration
 */
export function generatePhasePlanWithConfig(
  concept: AppConcept,
  config: Partial<PhaseGeneratorConfig>
): PhasePlanGenerationResult {
  const generator = new DynamicPhaseGenerator(config);
  return generator.generatePhasePlan(concept);
}

export default DynamicPhaseGenerator;
