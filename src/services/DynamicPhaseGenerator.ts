/**
 * Dynamic Phase Generator Service
 * 
 * Analyzes an AppConcept and generates an optimal number of phases (3-25+)
 * based on feature count, complexity, dependencies, and context limits.
 * 
 * Replaces the fixed 5-phase system with intelligent, adaptive phase planning.
 */

import type { AppConcept, Feature, TechnicalRequirements } from '@/types/appConcept';
import type {
  FeatureDomain,
  FeatureClassification,
  DynamicPhase,
  DynamicPhasePlan,
  PhasePlanGenerationResult,
  PhaseGeneratorConfig,
  FeaturesByDomain,
} from '@/types/dynamicPhases';

import {
  COMPLEX_FEATURE_PATTERNS as complexPatterns,
  MODERATE_FEATURE_PATTERNS as moderatePatterns,
  DEFAULT_PHASE_GENERATOR_CONFIG as defaultConfig,
} from '@/types/dynamicPhases';

// ============================================================================
// DEPENDENCY INFERENCE PATTERNS
// ============================================================================

// Authentication-related patterns
const AUTH_DEPENDENCY_PATTERNS = [
  'user account', 'user login', 'user authentication', 'user registration',
  'user session', 'user credential', 'sign in', 'sign up', 'log in', 'log out',
  'account creation', 'account management', 'profile management',
  'password', 'authentication', 'authorization'
];

// Database persistence patterns
const DATABASE_DEPENDENCY_PATTERNS = [
  'save data', 'store data', 'persist data', 'database',
  'data storage', 'save to database', 'store in database', 'persist to database',
  'conversation history', 'chat history', 'message history',
  'save conversation', 'store conversation', 'save message',
  'save to backend', 'store in backend', 'persist to backend'
];

// File storage patterns
const FILE_STORAGE_DEPENDENCY_PATTERNS = [
  'image upload', 'photo upload', 'file upload',
  'image storage', 'photo storage', 'file storage',
  'upload image', 'upload photo', 'upload file',
  'file attachment', 'image attachment'
];

// ============================================================================
// MAIN GENERATOR CLASS
// ============================================================================

export class DynamicPhaseGenerator {
  private config: PhaseGeneratorConfig;
  
  constructor(config: Partial<PhaseGeneratorConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }
  
  /**
   * Generate a complete phase plan from an AppConcept
   */
  generatePhasePlan(concept: AppConcept): PhasePlanGenerationResult {
    const warnings: string[] = [];
    
    try {
      // Step 1: Classify all features
      const classifications = this.classifyFeatures(concept.coreFeatures);
      
      // Step 2: Add implicit features from technical requirements
      const implicitFeatures = this.getImplicitFeatures(concept.technical);
      const allClassifications = [...classifications, ...implicitFeatures];
      
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
  
  // ============================================================================
  // FEATURE CLASSIFICATION
  // ============================================================================
  
  /**
   * Classify a single feature
   */
  private classifyFeature(feature: Feature): FeatureClassification {
    const lowerName = feature.name.toLowerCase();
    const lowerDesc = feature.description.toLowerCase();
    const combined = `${lowerName} ${lowerDesc}`;
    
    // Check for complex patterns first
    for (const pattern of complexPatterns) {
      if (pattern.patterns.some(p => combined.includes(p))) {
        return {
          originalFeature: feature,
          domain: pattern.domain,
          complexity: 'complex',
          estimatedTokens: pattern.baseTokenEstimate,
          requiresOwnPhase: pattern.requiresOwnPhase,
          suggestedPhaseName: pattern.suggestedName,
          dependencies: this.inferDependencies(feature, pattern.domain),
          keywords: pattern.patterns.filter(p => combined.includes(p)),
        };
      }
    }
    
    // Check for moderate patterns
    for (const pattern of moderatePatterns) {
      if (pattern.patterns.some(p => combined.includes(p))) {
        return {
          originalFeature: feature,
          domain: pattern.domain,
          complexity: 'moderate',
          estimatedTokens: pattern.baseTokenEstimate,
          requiresOwnPhase: false,
          suggestedPhaseName: feature.name,
          dependencies: this.inferDependencies(feature, pattern.domain),
          keywords: pattern.patterns.filter(p => combined.includes(p)),
        };
      }
    }
    
    // Default: simple feature
    return {
      originalFeature: feature,
      domain: 'feature',
      complexity: 'simple',
      estimatedTokens: this.config.baseTokenEstimates.simpleFeature,
      requiresOwnPhase: false,
      suggestedPhaseName: feature.name,
      dependencies: [],
      keywords: [],
    };
  }
  
  /**
   * Classify all features
   */
  private classifyFeatures(features: Feature[]): FeatureClassification[] {
    return features.map(f => this.classifyFeature(f));
  }
  
  /**
   * Get implicit features from technical requirements
   */
  private getImplicitFeatures(tech: TechnicalRequirements): FeatureClassification[] {
    const implicit: FeatureClassification[] = [];
    
    if (tech.needsAuth) {
      const authType = tech.authType || 'email';
      implicit.push({
        originalFeature: {
          id: 'implicit-auth',
          name: 'Authentication System',
          description: `${authType} authentication with login, logout, and session management`,
          priority: 'high',
        },
        domain: 'auth',
        complexity: 'complex',
        estimatedTokens: 4000,
        requiresOwnPhase: true,
        suggestedPhaseName: 'Authentication System',
        dependencies: tech.needsDatabase ? ['Database Setup'] : [],
        keywords: ['auth', authType],
      });
    }
    
    if (tech.needsDatabase) {
      implicit.push({
        originalFeature: {
          id: 'implicit-database',
          name: 'Database Setup',
          description: 'Database schema, configuration, and data models',
          priority: 'high',
        },
        domain: 'database',
        complexity: 'complex',
        estimatedTokens: 3500,
        requiresOwnPhase: true,
        suggestedPhaseName: 'Database Schema',
        dependencies: [],
        keywords: ['database', 'schema'],
      });
    }
    
    if (tech.needsRealtime) {
      implicit.push({
        originalFeature: {
          id: 'implicit-realtime',
          name: 'Real-time Updates',
          description: 'WebSocket connections for live data synchronization',
          priority: 'medium',
        },
        domain: 'real-time',
        complexity: 'complex',
        estimatedTokens: 4000,
        requiresOwnPhase: true,
        suggestedPhaseName: 'Real-time Features',
        dependencies: tech.needsDatabase ? ['Database Setup'] : [],
        keywords: ['realtime', 'websocket'],
      });
    }
    
    if (tech.needsFileUpload) {
      implicit.push({
        originalFeature: {
          id: 'implicit-storage',
          name: 'File Storage',
          description: 'File upload, storage, and media handling',
          priority: 'medium',
        },
        domain: 'storage',
        complexity: 'complex',
        estimatedTokens: 3500,
        requiresOwnPhase: true,
        suggestedPhaseName: 'File Storage',
        dependencies: [],
        keywords: ['upload', 'storage'],
      });
    }
    
    if (tech.needsAPI) {
      implicit.push({
        originalFeature: {
          id: 'implicit-api',
          name: 'API Integration',
          description: 'External API connections and service integration',
          priority: 'medium',
        },
        domain: 'integration',
        complexity: 'moderate',
        estimatedTokens: 2500,
        requiresOwnPhase: false,
        suggestedPhaseName: 'API Integration',
        dependencies: [],
        keywords: ['api', 'integration'],
      });
    }
    
    return implicit;
  }
  
  /**
   * Infer dependencies for a feature based on its domain
   */
  private inferDependencies(feature: Feature, domain: FeatureDomain): string[] {
    const deps: string[] = [];
    const lowerDesc = feature.description.toLowerCase();
    
    // Features that typically depend on auth
    if (AUTH_DEPENDENCY_PATTERNS.some(pattern => lowerDesc.includes(pattern))) {
      deps.push('Authentication System');
    }
    
    // Features that typically depend on database
    if (DATABASE_DEPENDENCY_PATTERNS.some(pattern => lowerDesc.includes(pattern))) {
      deps.push('Database Setup');
    }
    
    // Features that depend on storage
    if (FILE_STORAGE_DEPENDENCY_PATTERNS.some(pattern => lowerDesc.includes(pattern))) {
      deps.push('File Storage');
    }
    
    return deps;
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
        // Use a unique key for isolated features
        const isolatedDomain = classification.domain;
        if (!groups.has(isolatedDomain)) {
          groups.set(isolatedDomain, []);
        }
        
        // Check if this specific feature type already exists
        const existing = groups.get(isolatedDomain)!;
        const alreadyExists = existing.some(
          c => c.suggestedPhaseName === classification.suggestedPhaseName
        );
        
        if (!alreadyExists) {
          groups.get(isolatedDomain)!.push(classification);
        }
      } else {
        // Group by domain
        if (!groups.has(classification.domain)) {
          groups.set(classification.domain, []);
        }
        groups.get(classification.domain)!.push(classification);
      }
    }
    
    return groups;
  }
  
  // ============================================================================
  // PHASE GENERATION
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
    
    // Phase 1: ALWAYS start with Setup
    phases.push(this.createSetupPhase(phaseNumber++, concept));
    
    // Phase 2: Database (if needed) - always comes early
    if (featuresByDomain.has('database')) {
      const dbFeatures = featuresByDomain.get('database')!;
      phases.push(this.createPhaseFromFeatures(
        phaseNumber++,
        'Database Schema',
        'Set up database tables, types, and configuration',
        'database',
        dbFeatures
      ));
      featuresByDomain.delete('database');
    }
    
    // Phase 3: Authentication (if needed) - comes after database
    if (featuresByDomain.has('auth')) {
      const authFeatures = featuresByDomain.get('auth')!;
      phases.push(this.createPhaseFromFeatures(
        phaseNumber++,
        'Authentication System',
        `Implement ${concept.technical.authType || 'email'} authentication`,
        'auth',
        authFeatures
      ));
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
      'offline',
    ];
    
    for (const domain of domainPriority) {
      if (!featuresByDomain.has(domain)) continue;
      
      const features = featuresByDomain.get(domain)!;
      
      // Split large feature groups into multiple phases
      const subPhases = this.splitFeaturesIntoPhases(features, domain);
      
      for (const subPhase of subPhases) {
        phases.push(this.createPhaseFromFeatures(
          phaseNumber++,
          subPhase.name,
          subPhase.description,
          domain,
          subPhase.features
        ));
      }
    }
    
    // Final Phase: ALWAYS end with Polish
    phases.push(this.createPolishPhase(phaseNumber, concept));
    
    return phases;
  }
  
  /**
   * Split features into appropriately sized phases
   */
  private splitFeaturesIntoPhases(
    features: FeatureClassification[],
    domain: FeatureDomain
  ): Array<{ name: string; description: string; features: FeatureClassification[] }> {
    const subPhases: Array<{ name: string; description: string; features: FeatureClassification[] }> = [];
    
    let currentFeatures: FeatureClassification[] = [];
    let currentTokens = 0;
    let subPhaseIndex = 1;
    
    // Sort by priority (high first) and complexity (simple first within priority)
    const sortedFeatures = [...features].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.originalFeature.priority] ?? 1;
      const bPriority = priorityOrder[b.originalFeature.priority] ?? 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      const complexityOrder = { simple: 0, moderate: 1, complex: 2 };
      return complexityOrder[a.complexity] - complexityOrder[b.complexity];
    });
    
    for (const feature of sortedFeatures) {
      const wouldExceedTokens = currentTokens + feature.estimatedTokens > this.config.maxTokensPerPhase;
      const wouldExceedFeatures = currentFeatures.length >= this.config.maxFeaturesPerPhase;
      
      if ((wouldExceedTokens || wouldExceedFeatures) && currentFeatures.length > 0) {
        // Save current phase and start new one
        subPhases.push({
          name: this.generatePhaseName(domain, currentFeatures, subPhaseIndex, subPhases.length + Math.ceil((sortedFeatures.length - currentFeatures.length) / this.config.maxFeaturesPerPhase)),
          description: this.generatePhaseDescription(currentFeatures),
          features: currentFeatures,
        });
        
        currentFeatures = [];
        currentTokens = 0;
        subPhaseIndex++;
      }
      
      currentFeatures.push(feature);
      currentTokens += feature.estimatedTokens;
    }
    
    // Don't forget the last batch
    if (currentFeatures.length > 0) {
      subPhases.push({
        name: this.generatePhaseName(domain, currentFeatures, subPhaseIndex, subPhases.length + 1),
        description: this.generatePhaseDescription(currentFeatures),
        features: currentFeatures,
      });
    }
    
    return subPhases;
  }
  
  /**
   * Generate a readable phase name
   */
  private generatePhaseName(
    domain: FeatureDomain,
    features: FeatureClassification[],
    partIndex: number,
    totalParts: number
  ): string {
    // If there's only one feature, use its suggested name
    if (features.length === 1) {
      return features[0].suggestedPhaseName;
    }
    
    // Domain-based naming
    const domainNames: Record<FeatureDomain, string> = {
      'setup': 'Project Setup',
      'database': 'Database',
      'auth': 'Authentication',
      'core-entity': 'Core Features',
      'feature': 'Features',
      'ui-component': 'UI Components',
      'integration': 'Integrations',
      'real-time': 'Real-time',
      'storage': 'Storage',
      'notification': 'Notifications',
      'offline': 'Offline Support',
      'search': 'Search',
      'analytics': 'Analytics',
      'admin': 'Admin',
      'ui-role': 'Role Views',
      'testing': 'Testing',
      'polish': 'Polish',
    };
    
    const baseName = domainNames[domain] || 'Features';
    
    // Add part number if split
    if (totalParts > 1) {
      return `${baseName} (Part ${partIndex})`;
    }
    
    return baseName;
  }
  
  /**
   * Generate a phase description from features
   */
  private generatePhaseDescription(features: FeatureClassification[]): string {
    if (features.length === 1) {
      return features[0].originalFeature.description;
    }
    
    const featureNames = features.map(f => f.originalFeature.name);
    if (featureNames.length <= 3) {
      return `Implement ${featureNames.join(', ')}`;
    }
    
    return `Implement ${featureNames.slice(0, 2).join(', ')}, and ${featureNames.length - 2} more features`;
  }
  
  // ============================================================================
  // SPECIAL PHASES
  // ============================================================================
  
  /**
   * Create the setup phase (always first)
   */
  private createSetupPhase(phaseNumber: number, concept: AppConcept): DynamicPhase {
    return {
      number: phaseNumber,
      name: 'Project Setup',
      description: 'Initialize project structure, dependencies, and base configuration',
      domain: 'setup',
      features: [
        'Folder structure and organization',
        'Package.json with dependencies',
        'TypeScript configuration',
        'Base styling (Tailwind setup)',
        'Core layout components',
        'Routing configuration',
      ],
      featureDetails: [],
      estimatedTokens: this.config.baseTokenEstimates.setupPhase,
      estimatedTime: '2-3 min',
      dependencies: [],
      dependencyNames: [],
      testCriteria: [
        'Project runs without errors',
        'Base layout renders correctly',
        'Navigation works between routes',
        'No console errors',
      ],
      status: 'pending',
    };
  }
  
  /**
   * Create the polish phase (always last)
   */
  private createPolishPhase(phaseNumber: number, concept: AppConcept): DynamicPhase {
    return {
      number: phaseNumber,
      name: 'Polish & Documentation',
      description: 'Final touches, animations, error states, and documentation',
      domain: 'polish',
      features: [
        'Loading states and skeletons',
        'Error handling and error states',
        'Empty states with helpful messages',
        'Micro-interactions and animations',
        'README.md with setup instructions',
        'Final code cleanup',
      ],
      featureDetails: [],
      estimatedTokens: this.config.baseTokenEstimates.polishPhase,
      estimatedTime: '2-3 min',
      dependencies: [phaseNumber - 1], // Depends on all previous
      dependencyNames: ['All previous phases'],
      testCriteria: [
        'All states have appropriate feedback',
        'Animations are smooth',
        'Documentation is complete',
        'No console warnings or errors',
      ],
      status: 'pending',
    };
  }
  
  /**
   * Create a phase from classified features
   */
  private createPhaseFromFeatures(
    phaseNumber: number,
    name: string,
    description: string,
    domain: FeatureDomain,
    features: FeatureClassification[]
  ): DynamicPhase {
    const totalTokens = features.reduce((sum, f) => sum + f.estimatedTokens, 0);
    const estimatedMinutes = Math.ceil(totalTokens / 1500); // Rough estimate
    
    return {
      number: phaseNumber,
      name,
      description,
      domain,
      features: features.map(f => f.originalFeature.name),
      featureDetails: features,
      estimatedTokens: totalTokens,
      estimatedTime: `${estimatedMinutes}-${estimatedMinutes + 2} min`,
      dependencies: [], // Will be calculated later
      dependencyNames: [],
      testCriteria: this.generateTestCriteria(features, domain),
      status: 'pending',
    };
  }
  
  /**
   * Generate test criteria for a phase
   */
  private generateTestCriteria(features: FeatureClassification[], domain: FeatureDomain): string[] {
    const criteria: string[] = [];
    
    // Domain-specific criteria
    switch (domain) {
      case 'auth':
        criteria.push('Login flow works correctly');
        criteria.push('Logout clears session');
        criteria.push('Protected routes redirect unauthenticated users');
        break;
      case 'database':
        criteria.push('Schema is valid');
        criteria.push('Types are generated');
        criteria.push('Queries execute without errors');
        break;
      case 'storage':
        criteria.push('Files can be uploaded');
        criteria.push('Files can be retrieved');
        criteria.push('Invalid files are rejected');
        break;
      case 'real-time':
        criteria.push('WebSocket connection establishes');
        criteria.push('Real-time updates are received');
        criteria.push('Reconnection works on disconnect');
        break;
      default:
        // Feature-based criteria
        for (const feature of features.slice(0, 3)) {
          criteria.push(`${feature.originalFeature.name} works as expected`);
        }
        if (features.length > 3) {
          criteria.push(`All ${features.length} features are functional`);
        }
    }
    
    // Always include these
    criteria.push('No console errors');
    
    return criteria;
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
        const dbPhase = phases.find(p => p.domain === 'database');
        if (dbPhase && dbPhase.number < phase.number) {
          deps.add(dbPhase.number);
          depNames.add('Database Schema');
        }
      }
      
      // Auth-dependent domains
      const authDependentDomains: FeatureDomain[] = ['admin', 'ui-role', 'analytics'];
      if (authDependentDomains.includes(phase.domain)) {
        const authPhase = phases.find(p => p.domain === 'auth');
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
  private validatePhasePlan(phases: DynamicPhase[]): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check phase count
    if (phases.length < this.config.minPhases) {
      errors.push(`Too few phases: ${phases.length} (minimum: ${this.config.minPhases})`);
    }
    if (phases.length > this.config.maxPhases) {
      warnings.push(`High phase count: ${phases.length} (recommended max: ${this.config.maxPhases})`);
    }
    
    // Check for circular dependencies
    const visited = new Set<number>();
    const recursionStack = new Set<number>();
    
    const hasCycle = (phaseNum: number): boolean => {
      visited.add(phaseNum);
      recursionStack.add(phaseNum);
      
      const phase = phases.find(p => p.number === phaseNum);
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
        warnings.push(`Phase ${phase.number} (${phase.name}) may exceed context limits: ${phase.estimatedTokens} tokens`);
      }
    }
    
    // Check for orphan features
    const allFeatures = phases.flatMap(p => p.features);
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
    const totalTokens = phases.reduce((sum, p) => sum + p.estimatedTokens, 0);
    const totalMinutes = phases.reduce((sum, p) => {
      const match = p.estimatedTime.match(/(\d+)/);
      return sum + (match ? parseInt(match[1]) : 3);
    }, 0);
    
    // Determine overall complexity
    let complexity: DynamicPhasePlan['complexity'];
    if (phases.length <= 3) {
      complexity = 'simple';
    } else if (phases.length <= 6) {
      complexity = 'moderate';
    } else if (phases.length <= 12) {
      complexity = 'complex';
    } else {
      complexity = 'enterprise';
    }
    
    return {
      id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      appName: concept.name,
      appDescription: concept.description,
      totalPhases: phases.length,
      phases,
      estimatedTotalTime: `${totalMinutes}-${totalMinutes + phases.length * 2} min`,
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
    
    const complexFeatures = classifications.filter(c => c.complexity === 'complex').length;
    const totalTokens = classifications.reduce((sum, c) => sum + c.estimatedTokens, 0);
    const avgTokensPerPhase = totalTokens / Math.max(1, featuresByDomain.size + 2); // +2 for setup and polish
    
    return {
      totalFeatures: classifications.length,
      complexFeatures,
      domainBreakdown: domainBreakdown as Record<FeatureDomain, number>,
      estimatedContextPerPhase: Math.round(avgTokensPerPhase),
    };
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
