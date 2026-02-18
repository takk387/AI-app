/**
 * Phase Factory
 *
 * Creates special phases (setup, layout injection, polish)
 * and feature-based phases with proper naming, test criteria, and context.
 */

import type { AppConcept, UserRole } from '@/types/appConcept';
import type {
  FeatureDomain,
  FeatureClassification,
  DynamicPhase,
  PhaseGeneratorConfig,
} from '@/types/dynamicPhases';

// ============================================================================
// DESIGN CONTEXT
// ============================================================================

/**
 * Build design context string from concept
 */
export function buildDesignContext(concept: AppConcept): string {
  const parts: string[] = [];

  if (concept.uiPreferences) {
    if (concept.uiPreferences.style && concept.uiPreferences.style !== 'custom') {
      parts.push(`${concept.uiPreferences.style} design style`);
    }
    if (concept.uiPreferences.colorScheme && concept.uiPreferences.colorScheme !== 'auto') {
      parts.push(`${concept.uiPreferences.colorScheme} color scheme`);
    }
    if (concept.uiPreferences.primaryColor) {
      parts.push(`primary color: ${concept.uiPreferences.primaryColor}`);
    }
    if (concept.uiPreferences.layout && concept.uiPreferences.layout !== 'custom') {
      parts.push(`${concept.uiPreferences.layout} layout`);
    }
  }

  if (concept.targetUsers) {
    parts.push(`designed for ${concept.targetUsers}`);
  }

  return parts.length > 0 ? `Design: ${parts.join(', ')}.` : '';
}

// ============================================================================
// SPECIAL PHASES
// ============================================================================

/**
 * Create the setup phase (always first)
 * Includes design context from concept for consistent styling
 */
export function createSetupPhase(
  phaseNumber: number,
  concept: AppConcept,
  config: PhaseGeneratorConfig
): DynamicPhase {
  const designContext = buildDesignContext(concept);

  return {
    number: phaseNumber,
    name: 'Project Setup',
    description: `Initialize project structure, dependencies, and base configuration for "${concept.name}". ${designContext}`,
    domain: 'setup',
    features: [
      'Folder structure and organization',
      'Package.json with dependencies',
      'TypeScript configuration',
      `Base styling (Tailwind setup with ${concept.uiPreferences?.colorScheme ?? 'neutral'} theme, ${concept.uiPreferences?.style ?? 'modern'} style)`,
      'Core layout components',
      'Routing configuration',
      ...(concept.uiPreferences?.layout === 'dashboard' ? ['Dashboard layout skeleton'] : []),
      // Production features - always included
      'ErrorBoundary component wrapping App with fallback UI and retry button',
      'Semantic HTML structure (nav, main, section, footer)',
      'Accessibility foundation (ARIA labels, keyboard navigation, focus indicators)',
      'SEO meta tags (title, description, Open Graph)',
    ],
    featureDetails: [],
    // Add ~800 tokens for production features
    estimatedTokens: config.baseTokenEstimates.setupPhase + 800,
    estimatedTime: '3-4 min',
    dependencies: [],
    dependencyNames: [],
    testCriteria: [
      'Project runs without errors',
      'Base layout renders correctly',
      `Theme matches ${concept.uiPreferences?.style ?? 'modern'} style with ${concept.uiPreferences?.colorScheme ?? 'neutral'} colors`,
      'Navigation works between routes',
      'No console errors',
      // Production test criteria
      'ErrorBoundary catches errors and displays fallback UI',
      'All interactive elements are keyboard accessible',
      'Semantic HTML elements are used (nav, main, footer, not just divs)',
      'Page has proper title and meta description',
    ],
    status: 'pending',
    conceptContext: {
      purpose: concept.purpose,
      targetUsers: concept.targetUsers,
      uiPreferences: concept.uiPreferences,
      layoutManifest: concept.layoutManifest,
      roles: concept.roles,
    },
  };
}

/**
 * Create the Layout Injection phase.
 * Replaces both Setup and Design System when the user built a layout
 * in the Layout Builder. The Builder will inject the pre-built code
 * directly (no AI call), auto-completing this phase instantly.
 */
export function createLayoutInjectionPhase(phaseNumber: number, concept: AppConcept): DynamicPhase {
  const layoutManifest = concept.layoutManifest!;
  const designSystem = layoutManifest.designSystem || {
    colors: {},
    fonts: { heading: 'Inter', body: 'Inter' },
  };
  const detectedFeatures = layoutManifest.detectedFeatures || [];

  return {
    number: phaseNumber,
    name: 'Layout Injection',
    description: `Inject pre-built layout code from Layout Builder as the app foundation for "${concept.name}". Includes design system tokens, responsive layout, and navigation structure.`,
    domain: 'setup',
    isLayoutInjection: true,
    features: [
      'Pre-built layout structure from Layout Builder',
      `Design system: ${Object.keys(designSystem.colors).length} color tokens, ${designSystem.fonts.heading}/${designSystem.fonts.body} typography`,
      'Navigation framework and routing structure',
      'Responsive layout with mobile-first approach',
      ...(detectedFeatures.length > 0
        ? [`Detected components: ${detectedFeatures.slice(0, 6).join(', ')}`]
        : []),
    ],
    featureDetails: [],
    estimatedTokens: 500, // Low — injecting pre-built code, not generating
    estimatedTime: 'Instant',
    dependencies: [],
    dependencyNames: [],
    testCriteria: [
      'Layout renders correctly in preview',
      'Design tokens (colors, fonts) are applied',
      'Navigation structure works',
      'Responsive at all breakpoints',
    ],
    status: 'pending',
    conceptContext: {
      purpose: concept.purpose,
      targetUsers: concept.targetUsers,
      uiPreferences: concept.uiPreferences,
      layoutManifest: layoutManifest,
      roles: concept.roles,
    },
  };
}

/**
 * Create the polish phase (always last)
 * Includes full concept context for final refinements
 */
export function createPolishPhase(
  phaseNumber: number,
  concept: AppConcept,
  config: PhaseGeneratorConfig
): DynamicPhase {
  const designContext = buildDesignContext(concept);

  return {
    number: phaseNumber,
    name: 'Polish & Documentation',
    description: `Final touches, animations, error states, and documentation for "${concept.name}". ${designContext}`,
    domain: 'polish',
    features: [
      'Loading states and skeletons',
      'Error handling and error states',
      'Empty states with helpful messages',
      `Micro-interactions and animations (${concept.uiPreferences?.style ?? 'modern'} style)`,
      'README.md with setup instructions',
      'Final code cleanup',
      ...(concept.roles && concept.roles.length > 0
        ? [`Role-specific UX polish for: ${concept.roles.map((r) => r.name).join(', ')}`]
        : []),
    ],
    featureDetails: [],
    estimatedTokens: config.baseTokenEstimates.polishPhase,
    estimatedTime: '2-3 min',
    dependencies: Array.from({ length: phaseNumber - 1 }, (_, i) => i + 1), // Depends on all previous
    dependencyNames: ['All previous phases'],
    testCriteria: [
      'All states have appropriate feedback',
      `Animations match ${concept.uiPreferences?.style ?? 'modern'} style`,
      'Documentation is complete',
      `App serves ${concept.targetUsers} effectively`,
      'No console warnings or errors',
    ],
    status: 'pending',
    conceptContext: {
      purpose: concept.purpose,
      targetUsers: concept.targetUsers,
      uiPreferences: concept.uiPreferences,
      layoutManifest: concept.layoutManifest,
      roles: concept.roles,
      conversationContext: concept.conversationContext,
    },
    relevantRoles: concept.roles?.map((r) => r.name),
  };
}

// ============================================================================
// FEATURE-BASED PHASE CREATION
// ============================================================================

/**
 * Create a phase from classified features
 * Includes concept context for rich detail preservation
 */
export function createPhaseFromFeatures(
  phaseNumber: number,
  name: string,
  description: string,
  domain: FeatureDomain,
  features: FeatureClassification[],
  concept?: AppConcept
): DynamicPhase {
  const totalTokens = features.reduce((sum, f) => sum + f.estimatedTokens, 0);
  const estimatedMinutes = Math.ceil(totalTokens / 1500); // Rough estimate

  // Determine which roles are relevant to this phase's features
  const relevantRoles = findRelevantRoles(features, concept?.roles);

  // Build enriched description with context
  let enrichedDescription = description;
  if (concept) {
    const designContext = buildDesignContext(concept);
    if (designContext) {
      enrichedDescription = `${description}. ${designContext}`;
    }
    if (relevantRoles.length > 0) {
      enrichedDescription += ` For users: ${relevantRoles.join(', ')}.`;
    }
  }

  return {
    number: phaseNumber,
    name,
    description: enrichedDescription,
    domain,
    features: features.map((f) => f.originalFeature.name),
    featureDetails: features,
    estimatedTokens: totalTokens,
    estimatedTime: `${estimatedMinutes}-${estimatedMinutes + 2} min`,
    dependencies: [], // Will be calculated later
    dependencyNames: [],
    testCriteria: generateTestCriteria(features, domain),
    status: 'pending',
    conceptContext: concept
      ? {
          purpose: concept.purpose,
          targetUsers: concept.targetUsers,
          uiPreferences: concept.uiPreferences,
          layoutManifest: concept.layoutManifest, // CRITICAL: Include layout manifest for all phases
          roles: concept.roles,
          dataModels: concept.technical.dataModels,
        }
      : undefined,
    relevantRoles: relevantRoles.length > 0 ? relevantRoles : undefined,
  };
}

// ============================================================================
// NAMING & DESCRIPTION HELPERS
// ============================================================================

/**
 * Generate a readable phase name
 */
export function generatePhaseName(
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
    setup: 'Project Setup',
    database: 'Database',
    auth: 'Authentication',
    i18n: 'Internationalization',
    'core-entity': 'Core Features',
    feature: 'Features',
    'ui-component': 'UI Components',
    integration: 'Integrations',
    'real-time': 'Real-time',
    storage: 'Storage',
    notification: 'Notifications',
    offline: 'Offline Support',
    search: 'Search',
    analytics: 'Analytics',
    admin: 'Admin',
    'ui-role': 'Role Views',
    testing: 'Testing',
    'backend-validator': 'Backend Validation',
    devops: 'DevOps & Infrastructure',
    monitoring: 'Monitoring & Observability',
    polish: 'Polish',
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
export function generatePhaseDescription(features: FeatureClassification[]): string {
  if (features.length === 1) {
    return features[0].originalFeature.description;
  }

  const featureNames = features.map((f) => f.originalFeature.name);
  if (featureNames.length <= 3) {
    return `Implement ${featureNames.join(', ')}`;
  }

  return `Implement ${featureNames.slice(0, 2).join(', ')}, and ${featureNames.length - 2} more features`;
}

// ============================================================================
// PHASE SPLITTING
// ============================================================================

/**
 * Split features into appropriately sized phases
 */
export function splitFeaturesIntoPhases(
  features: FeatureClassification[],
  domain: FeatureDomain,
  config: PhaseGeneratorConfig
): Array<{ name: string; description: string; features: FeatureClassification[] }> {
  const subPhases: Array<{
    name: string;
    description: string;
    features: FeatureClassification[];
  }> = [];

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
    const wouldExceedTokens = currentTokens + feature.estimatedTokens > config.maxTokensPerPhase;
    const wouldExceedFeatures = currentFeatures.length >= config.maxFeaturesPerPhase;

    if ((wouldExceedTokens || wouldExceedFeatures) && currentFeatures.length > 0) {
      // Save current phase and start new one
      subPhases.push({
        name: generatePhaseName(
          domain,
          currentFeatures,
          subPhaseIndex,
          subPhases.length +
            Math.ceil((sortedFeatures.length - currentFeatures.length) / config.maxFeaturesPerPhase)
        ),
        description: generatePhaseDescription(currentFeatures),
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
      name: generatePhaseName(domain, currentFeatures, subPhaseIndex, subPhases.length + 1),
      description: generatePhaseDescription(currentFeatures),
      features: currentFeatures,
    });
  }

  return subPhases;
}

// ============================================================================
// ROLE & TEST CRITERIA HELPERS
// ============================================================================

/**
 * Find which user roles are relevant to a set of features
 */
export function findRelevantRoles(features: FeatureClassification[], roles?: UserRole[]): string[] {
  if (!roles || roles.length === 0) return [];

  const relevantRoles: Set<string> = new Set();

  for (const feature of features) {
    const featureText =
      `${feature.originalFeature.name} ${feature.originalFeature.description}`.toLowerCase();

    for (const role of roles) {
      const roleName = role.name.toLowerCase();
      // Check if feature mentions this role
      if (featureText.includes(roleName)) {
        relevantRoles.add(role.name);
      }
      // Check if feature relates to role capabilities
      for (const capability of role.capabilities) {
        if (featureText.includes(capability.toLowerCase())) {
          relevantRoles.add(role.name);
          break;
        }
      }
    }
  }

  return Array.from(relevantRoles);
}

/**
 * Generate test criteria for a phase
 */
export function generateTestCriteria(
  features: FeatureClassification[],
  domain: FeatureDomain
): string[] {
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
    case 'backend-validator':
      criteria.push('Database schema matches requirements');
      criteria.push('API routes exist and export correct methods');
      criteria.push('Auth checks are implemented where required');
      break;
    case 'devops':
      criteria.push('Build pipeline succeeds');
      criteria.push('Environment variables are configured');
      criteria.push('Deployment configuration is valid');
      break;
    case 'monitoring':
      criteria.push('Error logging is initialized');
      criteria.push('Performance metrics are tracked');
      criteria.push('Health check endpoint returns 200');
      break;
    default:
      // Feature-based criteria
      for (const feature of features.slice(0, 6)) {
        criteria.push(`${feature.originalFeature.name} works as expected`);
      }
      if (features.length > 6) {
        criteria.push(`All ${features.length} features are functional`);
      }
  }

  // Always include these
  criteria.push('No console errors');

  return criteria;
}
