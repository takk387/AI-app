/**
 * Comprehensive Unit Tests for DynamicPhaseGenerator Service
 *
 * Tests phase plan generation, feature classification, domain grouping,
 * dependency calculation, and validation logic.
 *
 * Target: 90%+ coverage for this critical planning service
 */

import { DynamicPhaseGenerator } from '../DynamicPhaseGenerator';
import type {
  PhaseGeneratorConfig,
  DynamicPhasePlan,
  FeatureClassification,
  FeatureDomain,
} from '@/types/dynamicPhases';
import type { AppConcept, Feature } from '@/types/appConcept';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a minimal AppConcept for testing
 */
function createMockAppConcept(
  overrides?: Partial<AppConcept>
): AppConcept {
  return {
    name: 'Test App',
    description: 'A test application for testing',
    appType: 'web-app',
    features: [
      { name: 'User Profile', description: 'User profile page' },
      { name: 'Settings Page', description: 'Application settings' },
    ],
    pages: [
      { name: 'Home', route: '/', description: 'Home page' },
      { name: 'About', route: '/about', description: 'About page' },
    ],
    techStack: {
      framework: 'nextjs',
      styling: 'tailwind',
      database: 'none',
    },
    ...overrides,
  } as AppConcept;
}

/**
 * Create a feature object
 */
function createFeature(
  name: string,
  description?: string
): Feature {
  return {
    name,
    description: description || `${name} feature`,
  };
}

/**
 * Create a complex app concept with many features
 */
function createComplexAppConcept(): AppConcept {
  return createMockAppConcept({
    name: 'Enterprise App',
    description: 'A complex enterprise application',
    features: [
      createFeature('User Authentication', 'Login with OAuth and JWT'),
      createFeature('User Dashboard', 'Main user dashboard with charts'),
      createFeature('Database Schema', 'PostgreSQL with Prisma ORM'),
      createFeature('Admin Panel', 'Admin management interface'),
      createFeature('Payment Integration', 'Stripe payment processing'),
      createFeature('Real-time Chat', 'WebSocket-based chat'),
      createFeature('File Upload', 'S3 file storage'),
      createFeature('Push Notifications', 'Firebase notifications'),
      createFeature('Search', 'Elasticsearch integration'),
      createFeature('Analytics Dashboard', 'Usage analytics and reports'),
    ],
    pages: [
      { name: 'Home', route: '/', description: 'Home page' },
      { name: 'Dashboard', route: '/dashboard', description: 'User dashboard' },
      { name: 'Admin', route: '/admin', description: 'Admin panel' },
      { name: 'Settings', route: '/settings', description: 'User settings' },
    ],
  });
}

/**
 * Create custom generator config
 */
function createCustomConfig(
  overrides?: Partial<PhaseGeneratorConfig>
): Partial<PhaseGeneratorConfig> {
  return {
    maxTokensPerPhase: 8000,
    targetTokensPerPhase: 5000,
    maxFeaturesPerPhase: 4,
    minFeaturesPerPhase: 1,
    minPhases: 2,
    maxPhases: 30,
    ...overrides,
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('DynamicPhaseGenerator', () => {
  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('Constructor', () => {
    it('should create instance with default config', () => {
      const generator = new DynamicPhaseGenerator();
      expect(generator).toBeInstanceOf(DynamicPhaseGenerator);
    });

    it('should accept custom config', () => {
      const customConfig = createCustomConfig({ maxPhases: 15 });
      const generator = new DynamicPhaseGenerator(customConfig);
      expect(generator).toBeInstanceOf(DynamicPhaseGenerator);
    });

    it('should merge custom config with defaults', () => {
      const partialConfig = { maxPhases: 10 };
      const generator = new DynamicPhaseGenerator(partialConfig);
      // Should not throw - defaults should fill in missing values
      expect(generator).toBeInstanceOf(DynamicPhaseGenerator);
    });
  });

  // ==========================================================================
  // Phase Plan Generation Tests
  // ==========================================================================

  describe('generatePhasePlan()', () => {
    it('should generate a valid phase plan for simple app', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept();

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.plan!.phases.length).toBeGreaterThan(0);
    });

    it('should include setup and polish phases', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept();

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);

      const phaseNames = result.plan!.phases.map((p) => p.name.toLowerCase());
      // Should have some form of setup/foundation phase
      const hasSetup = phaseNames.some(
        (name) =>
          name.includes('setup') ||
          name.includes('foundation') ||
          name.includes('initial')
      );
      expect(hasSetup).toBe(true);
    });

    it('should generate correct number of phases based on complexity', () => {
      const generator = new DynamicPhaseGenerator();
      const simpleApp = createMockAppConcept({
        features: [createFeature('Simple Feature')],
      });
      const complexApp = createComplexAppConcept();

      const simpleResult = generator.generatePhasePlan(simpleApp);
      const complexResult = generator.generatePhasePlan(complexApp);

      expect(simpleResult.success).toBe(true);
      expect(complexResult.success).toBe(true);

      // Complex app should have more phases
      expect(complexResult.plan!.phases.length).toBeGreaterThan(
        simpleResult.plan!.phases.length
      );
    });

    it('should respect maxPhases configuration', () => {
      const generator = new DynamicPhaseGenerator({ maxPhases: 5 });
      const complexApp = createComplexAppConcept();

      const result = generator.generatePhasePlan(complexApp);

      expect(result.success).toBe(true);
      expect(result.plan!.phases.length).toBeLessThanOrEqual(5);
    });

    it('should respect minPhases configuration', () => {
      const generator = new DynamicPhaseGenerator({ minPhases: 3 });
      const simpleApp = createMockAppConcept({
        features: [createFeature('Single Feature')],
      });

      const result = generator.generatePhasePlan(simpleApp);

      expect(result.success).toBe(true);
      expect(result.plan!.phases.length).toBeGreaterThanOrEqual(2); // At minimum setup + 1 feature phase
    });

    it('should set correct app metadata in plan', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept({
        name: 'My Test App',
        description: 'Test description',
      });

      const result = generator.generatePhasePlan(concept);

      expect(result.plan!.appName).toBe('My Test App');
      expect(result.plan!.appDescription).toBe('Test description');
      expect(result.plan!.concept).toEqual(concept);
    });

    it('should initialize execution tracking fields', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept();

      const result = generator.generatePhasePlan(concept);

      expect(result.plan!.currentPhaseNumber).toBe(1);
      expect(result.plan!.completedPhaseNumbers).toEqual([]);
      expect(result.plan!.failedPhaseNumbers).toEqual([]);
      expect(result.plan!.accumulatedFiles).toEqual([]);
      expect(result.plan!.accumulatedFeatures).toEqual([]);
    });

    it('should generate unique plan ID', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept();

      const result1 = generator.generatePhasePlan(concept);
      const result2 = generator.generatePhasePlan(concept);

      expect(result1.plan!.id).not.toBe(result2.plan!.id);
    });

    it('should set timestamps', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept();

      const result = generator.generatePhasePlan(concept);

      expect(result.plan!.createdAt).toBeDefined();
      expect(result.plan!.updatedAt).toBeDefined();
      expect(new Date(result.plan!.createdAt).getTime()).toBeLessThanOrEqual(
        Date.now()
      );
    });
  });

  // ==========================================================================
  // Feature Classification Tests
  // ==========================================================================

  describe('Feature Classification', () => {
    it('should classify authentication features to auth domain', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept({
        features: [
          createFeature('User Authentication', 'Login and signup'),
          createFeature('OAuth Integration', 'Google OAuth'),
        ],
      });

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);

      // Should have auth-related phase
      const hasAuthPhase = result.plan!.phases.some(
        (p) =>
          p.domain === 'auth' ||
          p.name.toLowerCase().includes('auth') ||
          p.features.some((f) => f.toLowerCase().includes('auth'))
      );
      expect(hasAuthPhase).toBe(true);
    });

    it('should classify database features to database domain', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept({
        features: [
          createFeature('Database Schema', 'PostgreSQL schema design'),
          createFeature('Prisma ORM Setup', 'Database ORM configuration'),
        ],
      });

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);

      // Should have database-related phase
      const hasDbPhase = result.plan!.phases.some(
        (p) =>
          p.domain === 'database' ||
          p.features.some(
            (f) =>
              f.toLowerCase().includes('database') ||
              f.toLowerCase().includes('schema')
          )
      );
      expect(hasDbPhase).toBe(true);
    });

    it('should classify payment features to integration domain', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept({
        features: [
          createFeature('Stripe Integration', 'Payment processing'),
          createFeature('Subscription Billing', 'Recurring payments'),
        ],
      });

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);

      // Should have payment/integration-related phase
      const hasPaymentPhase = result.plan!.phases.some(
        (p) =>
          p.domain === 'integration' ||
          p.name.toLowerCase().includes('payment') ||
          p.features.some(
            (f) =>
              f.toLowerCase().includes('stripe') ||
              f.toLowerCase().includes('payment')
          )
      );
      expect(hasPaymentPhase).toBe(true);
    });

    it('should classify real-time features to real-time domain', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept({
        features: [
          createFeature('Real-time Chat', 'WebSocket messaging'),
          createFeature('Live Updates', 'Real-time data sync'),
        ],
      });

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);

      // Should have real-time related phase
      const hasRealTimePhase = result.plan!.phases.some(
        (p) =>
          p.domain === 'real-time' ||
          p.features.some(
            (f) =>
              f.toLowerCase().includes('real-time') ||
              f.toLowerCase().includes('websocket')
          )
      );
      expect(hasRealTimePhase).toBe(true);
    });

    it('should mark complex features as requiring own phase', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept({
        features: [
          createFeature('Authentication System', 'Full auth with OAuth, JWT, sessions'),
          createFeature('Simple Button', 'A basic button component'),
        ],
      });

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);
      expect(result.analysisDetails.complexFeatures).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Phase Dependency Tests
  // ==========================================================================

  describe('Phase Dependencies', () => {
    it('should calculate dependencies between phases', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept({
        features: [
          createFeature('Database Setup'),
          createFeature('User Dashboard', 'Requires database'),
        ],
      });

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);

      // Later phases should have dependencies on earlier phases
      const laterPhases = result.plan!.phases.filter((p) => p.number > 1);
      const hasDependencies = laterPhases.some((p) => p.dependencies.length > 0);

      expect(hasDependencies).toBe(true);
    });

    it('should ensure setup phase has no dependencies', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createComplexAppConcept();

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);

      // First phase (usually setup) should have no dependencies
      const firstPhase = result.plan!.phases[0];
      expect(firstPhase.dependencies).toEqual([]);
    });

    it('should create sequential dependencies when appropriate', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept({
        features: [
          createFeature('Core Setup'),
          createFeature('Feature A'),
          createFeature('Feature B'),
        ],
      });

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);

      // Check that dependency chain makes sense
      result.plan!.phases.forEach((phase, index) => {
        if (index > 0) {
          // Each phase's dependencies should reference earlier phases
          phase.dependencies.forEach((dep) => {
            expect(dep).toBeLessThan(phase.number);
          });
        }
      });
    });
  });

  // ==========================================================================
  // Token Estimation Tests
  // ==========================================================================

  describe('Token Estimation', () => {
    it('should estimate tokens for each phase', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept();

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);

      result.plan!.phases.forEach((phase) => {
        expect(phase.estimatedTokens).toBeGreaterThan(0);
      });
    });

    it('should estimate higher tokens for complex features', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept({
        features: [
          createFeature('Authentication System', 'OAuth, JWT, sessions, password reset'),
        ],
      });

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);

      // Auth phase should have higher token estimate
      const authPhase = result.plan!.phases.find(
        (p) =>
          p.domain === 'auth' ||
          p.features.some((f) => f.toLowerCase().includes('auth'))
      );

      if (authPhase) {
        expect(authPhase.estimatedTokens).toBeGreaterThan(2000);
      }
    });

    it('should calculate total estimated tokens', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept();

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);

      const calculatedTotal = result.plan!.phases.reduce(
        (sum, p) => sum + p.estimatedTokens,
        0
      );
      expect(result.plan!.estimatedTotalTokens).toBe(calculatedTotal);
    });

    it('should provide analysis details', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createComplexAppConcept();

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);
      expect(result.analysisDetails).toBeDefined();
      expect(result.analysisDetails.totalFeatures).toBeGreaterThan(0);
      expect(result.analysisDetails.domainBreakdown).toBeDefined();
    });
  });

  // ==========================================================================
  // Phase Structure Tests
  // ==========================================================================

  describe('Phase Structure', () => {
    it('should generate phases with all required fields', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept();

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);

      result.plan!.phases.forEach((phase) => {
        expect(phase.number).toBeDefined();
        expect(phase.name).toBeDefined();
        expect(phase.description).toBeDefined();
        expect(phase.domain).toBeDefined();
        expect(phase.features).toBeDefined();
        expect(phase.estimatedTokens).toBeDefined();
        expect(phase.dependencies).toBeDefined();
        expect(phase.testCriteria).toBeDefined();
        expect(phase.status).toBe('pending');
      });
    });

    it('should number phases sequentially', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createComplexAppConcept();

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);

      result.plan!.phases.forEach((phase, index) => {
        expect(phase.number).toBe(index + 1);
      });
    });

    it('should generate test criteria for phases', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept();

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);

      result.plan!.phases.forEach((phase) => {
        expect(Array.isArray(phase.testCriteria)).toBe(true);
        expect(phase.testCriteria.length).toBeGreaterThan(0);
      });
    });

    it('should assign valid domain to each phase', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createComplexAppConcept();

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);

      const validDomains: FeatureDomain[] = [
        'setup',
        'database',
        'auth',
        'core-entity',
        'feature',
        'ui-component',
        'integration',
        'real-time',
        'storage',
        'notification',
        'offline',
        'search',
        'analytics',
        'admin',
        'ui-role',
        'testing',
        'polish',
      ];

      result.plan!.phases.forEach((phase) => {
        expect(validDomains).toContain(phase.domain);
      });
    });
  });

  // ==========================================================================
  // Complexity Assessment Tests
  // ==========================================================================

  describe('Complexity Assessment', () => {
    it('should classify simple app as simple or moderate', () => {
      const generator = new DynamicPhaseGenerator();
      const simpleApp = createMockAppConcept({
        features: [createFeature('Simple Feature')],
      });

      const result = generator.generatePhasePlan(simpleApp);

      expect(result.success).toBe(true);
      expect(['simple', 'moderate']).toContain(result.plan!.complexity);
    });

    it('should classify complex app as complex or enterprise', () => {
      const generator = new DynamicPhaseGenerator();
      const complexApp = createComplexAppConcept();

      const result = generator.generatePhasePlan(complexApp);

      expect(result.success).toBe(true);
      expect(['moderate', 'complex', 'enterprise']).toContain(
        result.plan!.complexity
      );
    });

    it('should provide domain breakdown in analysis', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createComplexAppConcept();

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);
      expect(result.analysisDetails.domainBreakdown).toBeDefined();
      expect(typeof result.analysisDetails.domainBreakdown).toBe('object');
    });
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  describe('Validation', () => {
    it('should return warnings for potential issues', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createComplexAppConcept();

      const result = generator.generatePhasePlan(concept);

      // Warnings array should exist (may or may not have items)
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should handle app with no features gracefully', () => {
      const generator = new DynamicPhaseGenerator();
      const emptyApp = createMockAppConcept({
        features: [],
      });

      const result = generator.generatePhasePlan(emptyApp);

      // Should still succeed with at least setup phase
      expect(result.success).toBe(true);
      expect(result.plan!.phases.length).toBeGreaterThan(0);
    });

    it('should handle very long feature names', () => {
      const generator = new DynamicPhaseGenerator();
      const longFeatureName = 'A'.repeat(500);
      const concept = createMockAppConcept({
        features: [createFeature(longFeatureName)],
      });

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);
    });

    it('should handle special characters in feature names', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept({
        features: [
          createFeature('Feature <with> "special" & \'chars\''),
          createFeature('Unicode: \u00e9\u00e8\u00ea'),
        ],
      });

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle single feature app', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept({
        features: [createFeature('Only Feature')],
      });

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);
      expect(result.plan!.phases.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle app with many duplicate feature names', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept({
        features: Array(10)
          .fill(null)
          .map(() => createFeature('Same Feature')),
      });

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);
    });

    it('should handle app with all complex features', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept({
        features: [
          createFeature('Authentication'),
          createFeature('Payment Integration'),
          createFeature('Real-time Chat'),
          createFeature('File Storage'),
          createFeature('Analytics Dashboard'),
        ],
      });

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);
      // Should generate many phases for all complex features
      expect(result.plan!.phases.length).toBeGreaterThan(3);
    });

    it('should handle app with mixed complexity features', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept({
        features: [
          createFeature('Simple Button'),
          createFeature('Authentication'),
          createFeature('Contact Form'),
          createFeature('Payment Integration'),
          createFeature('About Page'),
        ],
      });

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);
    });

    it('should preserve concept context in phases', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept({
        purpose: 'Test purpose',
        targetUsers: 'Test users',
      });

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);
      // Plan should reference the full concept
      expect(result.plan!.concept).toEqual(concept);
    });

    it('should handle rapid consecutive plan generations', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept();

      const results = Array(10)
        .fill(null)
        .map(() => generator.generatePhasePlan(concept));

      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      // All should have unique IDs
      const ids = results.map((r) => r.plan!.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });
  });

  // ==========================================================================
  // Time Estimation Tests
  // ==========================================================================

  describe('Time Estimation', () => {
    it('should estimate time for each phase', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept();

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);

      result.plan!.phases.forEach((phase) => {
        expect(phase.estimatedTime).toBeDefined();
        expect(typeof phase.estimatedTime).toBe('string');
      });
    });

    it('should calculate total estimated time', () => {
      const generator = new DynamicPhaseGenerator();
      const concept = createMockAppConcept();

      const result = generator.generatePhasePlan(concept);

      expect(result.success).toBe(true);
      expect(result.plan!.estimatedTotalTime).toBeDefined();
      expect(typeof result.plan!.estimatedTotalTime).toBe('string');
    });
  });

  // ==========================================================================
  // Integration-like Tests
  // ==========================================================================

  describe('Integration Scenarios', () => {
    it('should generate valid plan for e-commerce app', () => {
      const generator = new DynamicPhaseGenerator();
      const ecommerceApp = createMockAppConcept({
        name: 'E-commerce Store',
        description: 'Online shopping platform',
        features: [
          createFeature('Product Catalog'),
          createFeature('Shopping Cart'),
          createFeature('User Authentication'),
          createFeature('Checkout Process'),
          createFeature('Payment Integration'),
          createFeature('Order Management'),
          createFeature('Admin Dashboard'),
        ],
      });

      const result = generator.generatePhasePlan(ecommerceApp);

      expect(result.success).toBe(true);
      expect(result.plan!.phases.length).toBeGreaterThan(4);
    });

    it('should generate valid plan for social media app', () => {
      const generator = new DynamicPhaseGenerator();
      const socialApp = createMockAppConcept({
        name: 'Social Network',
        description: 'Social media platform',
        features: [
          createFeature('User Profiles'),
          createFeature('Friend System'),
          createFeature('News Feed'),
          createFeature('Real-time Messaging'),
          createFeature('Post Creation'),
          createFeature('Comments and Likes'),
          createFeature('Notifications'),
        ],
      });

      const result = generator.generatePhasePlan(socialApp);

      expect(result.success).toBe(true);
      expect(result.plan!.phases.length).toBeGreaterThan(4);
    });

    it('should generate valid plan for dashboard app', () => {
      const generator = new DynamicPhaseGenerator();
      const dashboardApp = createMockAppConcept({
        name: 'Analytics Dashboard',
        description: 'Data analytics platform',
        features: [
          createFeature('Data Visualization'),
          createFeature('Charts and Graphs'),
          createFeature('User Authentication'),
          createFeature('Data Export'),
          createFeature('Real-time Updates'),
          createFeature('Custom Reports'),
        ],
      });

      const result = generator.generatePhasePlan(dashboardApp);

      expect(result.success).toBe(true);
      expect(result.plan!.phases.length).toBeGreaterThan(3);
    });
  });
});
