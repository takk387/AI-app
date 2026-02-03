/**
 * Dynamic Phase Generation - API Route
 *
 * Takes a completed AppConcept and generates an optimal phase plan
 * using the DynamicPhaseGenerator service.
 *
 * Optionally accepts conversation messages to extract phase-specific context
 * using the PhaseContextExtractor.
 */

import { NextResponse } from 'next/server';
import { DynamicPhaseGenerator } from '@/services/DynamicPhaseGenerator';
import { BackendArchitectureAgent } from '@/services/BackendArchitectureAgent';
import type { AppConcept } from '@/types/appConcept';
import type { ChatMessage } from '@/types/aiBuilderTypes';
import type {
  PhaseGeneratorConfig,
  FeatureDomain,
  SerializedPhaseContext,
} from '@/types/dynamicPhases';
import type { ArchitectureSpec } from '@/types/architectureSpec';
import type { AppFile } from '@/types/railway';
import { extractContextForAllPhases, type PhaseContext } from '@/utils/phaseContextExtractor';

// Vercel serverless function config
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

interface GeneratePhasesRequest {
  concept: AppConcept;
  config?: Partial<PhaseGeneratorConfig>;
  conversationMessages?: ChatMessage[]; // Optional: for phase-specific context extraction
  architectureSpec?: ArchitectureSpec; // Optional: pre-generated architecture from wizard
  layoutBuilderFiles?: AppFile[]; // Optional: pre-built layout files from Layout Builder
}

/**
 * Convert PhaseContext to serializable format (removes non-JSON-safe fields)
 */
function serializePhaseContext(context: PhaseContext): SerializedPhaseContext {
  return {
    phaseType: context.phaseType,
    extractedRequirements: context.extractedRequirements,
    userDecisions: context.userDecisions,
    technicalNotes: context.technicalNotes,
    validationRules: context.validationRules,
    uiPatterns: context.uiPatterns,
    contextSummary: context.contextSummary,
    tokenEstimate: context.tokenEstimate,
  };
}

export async function POST(request: Request) {
  try {
    const body: GeneratePhasesRequest = await request.json();
    const {
      concept,
      config,
      conversationMessages,
      architectureSpec: preGeneratedSpec,
      layoutBuilderFiles,
    } = body;

    // Validate concept
    if (!concept) {
      return NextResponse.json(
        {
          error: 'App concept is required',
        },
        { status: 400 }
      );
    }

    if (!concept.name) {
      return NextResponse.json(
        {
          error: 'App concept must have a name',
        },
        { status: 400 }
      );
    }

    if (!concept.coreFeatures || concept.coreFeatures.length === 0) {
      return NextResponse.json(
        {
          error: 'App concept must have at least one feature',
        },
        { status: 400 }
      );
    }

    // Ensure required fields have defaults
    const normalizedConcept: AppConcept = {
      ...concept,
      description: concept.description || `A ${concept.name} application`,
      purpose: concept.purpose || concept.description || 'To be defined',
      targetUsers: concept.targetUsers || 'General users',
      technical: {
        ...concept.technical,
        needsAuth: concept.technical?.needsAuth ?? false,
        needsDatabase: concept.technical?.needsDatabase ?? false,
        needsAPI: concept.technical?.needsAPI ?? false,
        needsFileUpload: concept.technical?.needsFileUpload ?? false,
        needsRealtime: concept.technical?.needsRealtime ?? false,
      },
      uiPreferences: {
        ...concept.uiPreferences,
        style: concept.uiPreferences?.style ?? 'modern',
        colorScheme: concept.uiPreferences?.colorScheme ?? 'auto',
        layout: concept.uiPreferences?.layout ?? 'single-page',
      },
      createdAt: concept.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Auto-detect memory and state infrastructure needs from features
    // Only run detection if the flags aren't already explicitly set
    if (
      normalizedConcept.technical.stateComplexity === undefined ||
      normalizedConcept.technical.needsContextPersistence === undefined ||
      normalizedConcept.technical.needsStateHistory === undefined
    ) {
      const detectedMemoryNeeds = DynamicPhaseGenerator.detectMemoryNeeds(
        normalizedConcept.coreFeatures,
        normalizedConcept.description
      );

      const detectedStateComplexity = DynamicPhaseGenerator.inferStateComplexity(
        normalizedConcept.coreFeatures
      );

      // Apply detected values only if not already set
      if (normalizedConcept.technical.stateComplexity === undefined) {
        normalizedConcept.technical.stateComplexity = detectedStateComplexity;
      }
      if (normalizedConcept.technical.needsContextPersistence === undefined) {
        normalizedConcept.technical.needsContextPersistence =
          detectedMemoryNeeds.needsContextPersistence;
      }
      if (normalizedConcept.technical.needsStateHistory === undefined) {
        normalizedConcept.technical.needsStateHistory = detectedMemoryNeeds.needsStateHistory;
      }
      if (normalizedConcept.technical.needsCaching === undefined) {
        normalizedConcept.technical.needsCaching = detectedMemoryNeeds.needsCaching;
      }
    }

    // Use pre-generated architecture if provided, otherwise generate if backend is needed
    let architectureSpec: ArchitectureSpec | undefined = preGeneratedSpec;

    const needsBackend =
      normalizedConcept.technical.needsAuth ||
      normalizedConcept.technical.needsDatabase ||
      normalizedConcept.technical.needsRealtime ||
      normalizedConcept.technical.needsFileUpload;

    // Only generate architecture if not pre-generated and backend is needed
    if (!architectureSpec && needsBackend) {
      try {
        console.log('[generate-phases] App needs backend, calling BackendArchitectureAgent...');
        const agent = new BackendArchitectureAgent();
        const archResult = await agent.analyze(normalizedConcept);

        if (archResult.success && archResult.spec) {
          architectureSpec = archResult.spec;
          console.log(
            `[generate-phases] Architecture spec generated: ${archResult.spec.database.tables.length} tables, ${archResult.spec.api.routes.length} routes`
          );
        } else if (archResult.error) {
          console.warn('[generate-phases] Architecture generation failed:', archResult.error);
          // Continue without architecture spec - non-critical
        }
      } catch (agentError) {
        console.error('[generate-phases] BackendArchitectureAgent error:', agentError);
        // Continue without architecture spec - non-critical
      }
    } else if (architectureSpec) {
      console.log('[generate-phases] Using pre-generated architecture spec');
    }

    // Generate phase plan (with or without architecture)
    const generator = new DynamicPhaseGenerator(config);
    const result = architectureSpec
      ? generator.generatePhasePlanWithArchitecture(normalizedConcept, architectureSpec)
      : generator.generatePhasePlan(normalizedConcept);

    if (!result.success) {
      console.error(`Phase generation failed:`, result.error);
      return NextResponse.json(
        {
          error: result.error,
          warnings: result.warnings,
          analysisDetails: result.analysisDetails,
        },
        { status: 400 }
      );
    }

    // Validate that plan exists (defensive check)
    if (!result.plan) {
      console.error('Phase generation succeeded but no plan was created');
      return NextResponse.json(
        {
          error: 'Phase generation succeeded but no plan was created',
          suggestion: 'This may be a bug. Please try again with a simpler app description.',
        },
        { status: 500 }
      );
    }

    // Extract phase-specific context from conversation if messages provided
    let phaseContexts: Record<FeatureDomain, SerializedPhaseContext> | undefined;

    if (conversationMessages && conversationMessages.length > 0 && result.plan) {
      try {
        // Get unique domains from generated phases
        const phaseDomains = [...new Set(result.plan.phases.map((p) => p.domain))];

        // Extract context for each domain
        const contextMap = await extractContextForAllPhases(conversationMessages, phaseDomains);

        // Convert to serializable format
        phaseContexts = {} as Record<FeatureDomain, SerializedPhaseContext>;
        for (const [domain, context] of contextMap) {
          phaseContexts[domain] = serializePhaseContext(context);
        }

        // Attach to plan
        result.plan.phaseContexts = phaseContexts;

        console.log(`[generate-phases] Extracted context for ${phaseDomains.length} phase domains`);
      } catch (extractionError) {
        console.warn('[generate-phases] Context extraction failed:', extractionError);
        // Continue without phase contexts - non-critical
      }
    }

    // Attach layout builder files to plan if provided
    if (layoutBuilderFiles && layoutBuilderFiles.length > 0 && result.plan) {
      result.plan.layoutBuilderFiles = layoutBuilderFiles;
    }

    return NextResponse.json({
      success: true,
      plan: result.plan,
      architectureSpec, // Include architecture spec for downstream use
      warnings: result.warnings,
      analysisDetails: result.analysisDetails,
    });
  } catch (error) {
    console.error('Phase generation error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate phases',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Return phase generation info and examples
 */
export async function GET() {
  return NextResponse.json({
    name: 'Dynamic Phase Generator',
    version: '1.0',
    description: 'Generates optimal build phases based on app complexity',

    capabilities: [
      'Variable phase count (3-25+)',
      'Feature complexity analysis',
      'Domain-based grouping',
      'Dependency detection',
      'Context-aware sizing',
    ],

    complexityLevels: {
      simple: '2-3 phases, basic features',
      moderate: '4-6 phases, standard app',
      complex: '7-12 phases, multi-feature app',
      enterprise: '13-25+ phases, full platform',
    },

    alwaysSeparatePhases: [
      'Authentication',
      'Database Setup',
      'Real-time Features',
      'Offline Support',
      'External Integrations',
    ],

    exampleInput: {
      concept: {
        name: 'Field Service App',
        description: 'Mobile app for fire alarm installation company oversight',
        coreFeatures: [
          {
            id: '1',
            name: 'Work Orders',
            description: 'Create and manage work orders',
            priority: 'high',
          },
          {
            id: '2',
            name: 'Task Assignment',
            description: 'Chat/voice task assignment',
            priority: 'high',
          },
          {
            id: '3',
            name: 'Photo Submissions',
            description: 'Workers submit work photos',
            priority: 'high',
          },
        ],
        technical: {
          needsAuth: true,
          authType: 'phone',
          needsDatabase: true,
          needsRealtime: true,
          needsFileUpload: true,
        },
      },
    },

    exampleOutput: {
      totalPhases: 11,
      phases: [
        { number: 1, name: 'Project Setup', domain: 'setup' },
        { number: 2, name: 'Database Schema', domain: 'database' },
        { number: 3, name: 'Authentication System', domain: 'auth' },
        { number: 4, name: 'Work Orders & Job Sites', domain: 'core-entity' },
        { number: 5, name: 'Task System', domain: 'feature' },
        { number: 6, name: 'Photo Submissions', domain: 'storage' },
        { number: 7, name: 'Ticket System', domain: 'feature' },
        { number: 8, name: 'Activity Feed', domain: 'real-time' },
        { number: 9, name: 'Push Notifications', domain: 'notification' },
        { number: 10, name: 'Offline Support', domain: 'offline' },
        { number: 11, name: 'Polish & Documentation', domain: 'polish' },
      ],
      complexity: 'complex',
      estimatedTotalTime: '45-60 min',
    },
  });
}
